import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

// Load server/.env explicitly, regardless of which directory `node` was
// started from — this is a common cause of "vars are set but not seen".
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/lost-and-found";
const SALT_ROUNDS = 10;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log(`✓ MongoDB connected — ${MONGODB_URI}`))
  .catch((err) => console.error("✗ MongoDB connection failed:", err.message));

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// In-memory OTP store. Fine for a small app / demo; swap for Redis or a
// database table if this ever needs to survive a server restart or run
// across multiple instances.
// email -> { code, name, passwordHash, expiresAt, attempts, lastSentAt }
// The password is hashed with bcrypt the moment it arrives, so nothing
// plaintext ever sits in memory or gets written to Mongo.
const otpStore = new Map();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

// Google shows App Passwords as "abcd efgh ijkl mnop" for readability, but
// people often paste them with the spaces still in. Strip whitespace so a
// copy-paste like that doesn't silently break auth.
const GMAIL_USER = (process.env.GMAIL_USER || "").trim();
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error(
      "GMAIL_USER and/or GMAIL_APP_PASSWORD is missing. Check that server/.env exists and the server was restarted after creating it."
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

async function sendOtpEmail(email, name, code) {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: `"The Board" <${GMAIL_USER}>`,
    to: email,
    subject: `Your verification code is ${code}`,
    text: `Hi ${name || "there"},\n\nYour verification code for The Board is ${code}. It expires in 5 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 420px; margin: 0 auto;">
        <p style="color:#101828; font-size:14px;">Hi ${name || "there"},</p>
        <p style="color:#101828; font-size:14px;">Your verification code for <strong>The Board</strong> is:</p>
        <div style="font-size:32px; font-weight:700; letter-spacing:8px; color:#155eef; margin:16px 0;">${code}</div>
        <p style="color:#475467; font-size:13px;">This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Turns a raw nodemailer/SMTP error into a short, human-readable hint.
 * Logged to the server console (and, outside production, echoed back in
 * the API response) so the real cause is visible instead of a flat
 * "couldn't send email" every time.
 */
function describeMailError(err) {
  const code = err?.code || err?.responseCode;
  if (err.message?.includes("GMAIL_USER")) {
    return err.message;
  }
  if (code === "EAUTH" || err.responseCode === 535) {
    return "Gmail rejected the login. Make sure GMAIL_APP_PASSWORD is a 16-character App Password (not your normal Gmail password) and that 2-Step Verification is on for that account.";
  }
  if (code === "ESOCKET" || code === "ETIMEDOUT" || code === "ECONNECTION") {
    return "Couldn't reach Gmail's servers — check your network/firewall allows outbound SMTP (ports 465/587).";
  }
  return err.message || "Unknown email error.";
}

app.post("/api/send-otp", async (req, res) => {
  const { email, name, password } = req.body || {};

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ success: false, message: "A valid email is required." });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ success: false, message: "Please tell us your name." });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return res
      .status(400)
      .json({ success: false, message: "Password must be at least 6 characters." });
  }

  const existing = otpStore.get(email);
  if (existing && Date.now() - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt)) / 1000
    );
    return res
      .status(429)
      .json({ success: false, message: `Please wait ${waitSec}s before requesting another code.` });
  }

  try {
    const alreadyRegistered = await User.exists({ email: email.toLowerCase().trim() });
    if (alreadyRegistered) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in instead.",
      });
    }
  } catch (err) {
    console.error("DB lookup failed:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Couldn't reach the database. Please try again." });
  }

  const code = generateOtp();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  otpStore.set(email, {
    code,
    name: name.trim(),
    passwordHash,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: Date.now(),
  });

  try {
    await sendOtpEmail(email, name, code);
    res.json({ success: true, message: "Verification code sent." });
  } catch (err) {
    const reason = describeMailError(err);
    console.error("Failed to send OTP email:", reason, "\n", err);
    otpStore.delete(email);
    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Couldn't send the verification email. Please try again."
          : `Couldn't send the verification email: ${reason}`,
    });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body || {};

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and code are required." });
  }

  const entry = otpStore.get(email);
  if (!entry) {
    return res.status(400).json({
      success: false,
      message: "No verification code found for this email. Request a new one.",
    });
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: "This code has expired. Request a new one." });
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(email);
    return res.status(429).json({
      success: false,
      message: "Too many incorrect attempts. Request a new code.",
    });
  }

  if (entry.code !== String(otp).trim()) {
    entry.attempts += 1;
    return res.status(400).json({ success: false, message: "Incorrect code. Please try again." });
  }

  otpStore.delete(email);

  try {
    const user = await User.create({
      name: entry.name,
      email: email.toLowerCase().trim(),
      password: entry.passwordHash,
    });
    res.json({
      success: true,
      message: "Email verified.",
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    // 11000 = duplicate key (someone raced us and signed up with this
    // email between send-otp and verify-otp).
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in instead.",
      });
    }
    console.error("Failed to create user:", err.message);
    res.status(500).json({ success: false, message: "Couldn't create your account. Please try again." });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Same message for "no such user" and "wrong password" so a bad actor
    // can't use this endpoint to find out which emails are registered.
    if (!user) {
      return res.status(401).json({ success: false, message: "Incorrect email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect email or password." });
    }

    res.json({ success: true, user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error("Login failed:", err.message);
    res.status(500).json({ success: false, message: "Couldn't reach the database. Please try again." });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, async () => {
  console.log(`OTP server listening on http://localhost:${PORT}`);
  try {
    await getTransporter().verify();
    console.log(`✓ Gmail auth OK — sending as ${GMAIL_USER}`);
  } catch (err) {
    console.error(
      `✗ Gmail auth check failed: ${describeMailError(err)}\n` +
        "  OTP emails will NOT send until this is fixed. See server/.env."
    );
  }
});