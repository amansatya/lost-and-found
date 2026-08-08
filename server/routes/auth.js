import express from "express";

import User from "../models/User.js";
import PendingSignup from "../models/PendingSignup.js";

import {
  hashPassword,
  comparePassword,
} from "../utils/password.js";

import {
  generateOtp,
  hashOtp,
  verifyOtp,
  getOtpExpiration,
  isOtpExpired,
  canAttemptOtp,
  getRemainingOtpAttempts,
  canResendOtp,
  getRemainingResends,
  canSendOtpAgain,
  getResendWaitSeconds,
  OTP_CONFIG,
} from "../utils/otp.js";

import {
  createAuthToken,
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
} from "../utils/jwt.js";

import {
  sendSignupOtpEmail,
  describeMailError,
} from "../services/emailService.js";

import { requireAuth } from "../middleware/auth.js";
import { authRateLimits } from "../middleware/rateLimit.js";
import { verifyFirebaseIdToken } from "../services/firebaseAdmin.js";

const router = express.Router();
const isProduction = process.env.NODE_ENV === "production";

function normalizeEmail(email) {
  return email.toLowerCase().trim();
}

function isKiitEmail(email) {
  return /^[^\s@]+@kiit\.ac\.in$/i.test(email);
}

function nameFromEmail(email) {
  const localPart = email.split("@")[0] || "KIIT User";
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function publicUser(user) {
  const name = user.name?.trim() || nameFromEmail(user.email);
  return {
    id: user._id.toString(),
    name,
    email: user.email,
    verified: Boolean(user.verified),
    provider: user.provider,
  };
}

function setAuthCookie(res, user) {
  const token = createAuthToken(user);
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
  });
}

function otpResponse(entry) {
  return {
    expiresAt: new Date(entry.expiresAt).toISOString(),
    remainingAttempts: getRemainingOtpAttempts(entry.attempts),
    remainingResends: getRemainingResends(entry.resendCount),
    resendAvailableAt: new Date(
      new Date(entry.lastSentAt).getTime() + OTP_CONFIG.resendCooldownMs
    ).toISOString(),
  };
}

// -----------------------------------------------------------------------------
// POST /api/auth/signup
// -----------------------------------------------------------------------------

router.post("/signup", authRateLimits.signup, async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please enter your full name.",
    });
  }

  const normalizedName = name.trim();

  if (normalizedName.length < 2) {
    return res.status(400).json({
      success: false,
      message: "Name must be at least 2 characters.",
    });
  }

  if (normalizedName.length > 80) {
    return res.status(400).json({
      success: false,
      message: "Name must be 80 characters or fewer.",
    });
  }

  if (!email || typeof email !== "string") {
    return res.status(400).json({
      success: false,
      message: "A valid email is required.",
    });
  }

  const normalizedEmail = normalizeEmail(email);

  if (!isKiitEmail(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Only KIIT email addresses are allowed.",
    });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Password is required.",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters.",
    });
  }

  try {
    const existingUser = await User.exists({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in instead.",
      });
    }

    const existingPending = await PendingSignup.findOne({
      email: normalizedEmail,
    });

    if (existingPending) {
      if (!canSendOtpAgain(existingPending.lastSentAt)) {
        const waitSeconds = getResendWaitSeconds(existingPending.lastSentAt);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds}s before requesting another code.`,
          retryAfterSeconds: waitSeconds,
        });
      }

      if (!canResendOtp(existingPending.resendCount)) {
        return res.status(429).json({
          success: false,
          message: "You have reached the maximum number of OTP resends. Please try again later.",
          remainingResends: 0,
        });
      }
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const passwordHash = await hashPassword(password);
    const now = new Date();
    const resendCount = existingPending
      ? Number(existingPending.resendCount || 0) + 1
      : 0;

    const pendingSignup = await PendingSignup.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          email: normalizedEmail,
          name: normalizedName,
          passwordHash,
          otpHash,
          attempts: 0,
          resendCount,
          expiresAt: getOtpExpiration(now),
          lastSentAt: now,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    try {
      await sendSignupOtpEmail(normalizedEmail, otp);
    } catch (err) {
      await PendingSignup.deleteOne({ _id: pendingSignup._id });
      console.error("Failed to send signup OTP:", describeMailError(err), err);

      return res.status(500).json({
        success: false,
        message: isProduction
          ? "Couldn't send the verification email. Please try again."
          : `Couldn't send the verification email: ${describeMailError(err)}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification code sent.",
      ...otpResponse(pendingSignup),
    });
  } catch (err) {
    console.error("Signup failed:", err);
    return res.status(500).json({
      success: false,
      message: "Couldn't start registration. Please try again.",
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/verify-otp
// -----------------------------------------------------------------------------

router.post("/verify-otp", authRateLimits.verifyOtp, async (req, res) => {
  const { email, otp } = req.body || {};

  if (!email || typeof email !== "string" || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and verification code are required.",
    });
  }

  const normalizedEmail = normalizeEmail(email);

  if (!isKiitEmail(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Only KIIT email addresses are allowed.",
    });
  }

  const normalizedOtp = String(otp).trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    return res.status(400).json({
      success: false,
      message: "Verification code must contain 6 digits.",
    });
  }

  try {
    const pendingSignup = await PendingSignup.findOne({
      email: normalizedEmail,
    });

    if (!pendingSignup) {
      return res.status(400).json({
        success: false,
        message: "No active verification code was found. Request a new code.",
      });
    }

    if (isOtpExpired(pendingSignup.expiresAt)) {
      await PendingSignup.deleteOne({ _id: pendingSignup._id });
      return res.status(400).json({
        success: false,
        message: "This verification code has expired. Request a new one.",
      });
    }

    if (!canAttemptOtp(pendingSignup.attempts)) {
      await PendingSignup.deleteOne({ _id: pendingSignup._id });
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Request a new code.",
        remainingAttempts: 0,
      });
    }

    if (!verifyOtp(normalizedOtp, pendingSignup.otpHash)) {
      pendingSignup.attempts += 1;
      const remainingAttempts = getRemainingOtpAttempts(pendingSignup.attempts);

      if (pendingSignup.attempts >= OTP_CONFIG.maxAttempts) {
        await PendingSignup.deleteOne({ _id: pendingSignup._id });
        return res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Request a new code.",
          remainingAttempts: 0,
        });
      }

      await pendingSignup.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect verification code.",
        remainingAttempts,
        expiresAt: new Date(pendingSignup.expiresAt).toISOString(),
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      await PendingSignup.deleteOne({ _id: pendingSignup._id });
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in instead.",
      });
    }

    const user = await User.create({
      name: pendingSignup.name || nameFromEmail(normalizedEmail),
      email: normalizedEmail,
      passwordHash: pendingSignup.passwordHash,
      verified: true,
      provider: "email",
      googleUid: null,
      lastLogin: new Date(),
    });

    await PendingSignup.deleteOne({ _id: pendingSignup._id });
    setAuthCookie(res, user);

    return res.status(201).json({
      success: true,
      message: "Email verified and account created.",
      user: publicUser(user),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in instead.",
      });
    }

    console.error("OTP verification failed:", err);
    return res.status(500).json({
      success: false,
      message: "Couldn't verify the code. Please try again.",
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/resend-otp
// -----------------------------------------------------------------------------

router.post("/resend-otp", authRateLimits.resendOtp, async (req, res) => {
  const { email } = req.body || {};

  if (!email || typeof email !== "string") {
    return res.status(400).json({
      success: false,
      message: "A valid email is required.",
    });
  }

  const normalizedEmail = normalizeEmail(email);

  if (!isKiitEmail(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Only KIIT email addresses are allowed.",
    });
  }

  try {
    const pendingSignup = await PendingSignup.findOne({
      email: normalizedEmail,
    });

    if (!pendingSignup) {
      return res.status(400).json({
        success: false,
        message: "No pending registration was found. Please start registration again.",
      });
    }

    if (!canSendOtpAgain(pendingSignup.lastSentAt)) {
      const waitSeconds = getResendWaitSeconds(pendingSignup.lastSentAt);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds}s before requesting another code.`,
        retryAfterSeconds: waitSeconds,
      });
    }

    if (!canResendOtp(pendingSignup.resendCount)) {
      return res.status(429).json({
        success: false,
        message: "You have reached the maximum number of OTP resends.",
        remainingResends: 0,
      });
    }

    const otp = generateOtp();
    const now = new Date();
    const nextResendCount = Number(pendingSignup.resendCount || 0) + 1;

    pendingSignup.otpHash = hashOtp(otp);
    pendingSignup.attempts = 0;
    pendingSignup.resendCount = nextResendCount;
    pendingSignup.expiresAt = getOtpExpiration(now);
    pendingSignup.lastSentAt = now;

    await pendingSignup.save();

    try {
      await sendSignupOtpEmail(normalizedEmail, otp);
    } catch (err) {
      console.error("Failed to send replacement OTP:", describeMailError(err), err);
      return res.status(500).json({
        success: false,
        message: isProduction
          ? "Couldn't send the new verification email. Please try again."
          : `Couldn't send the new verification email: ${describeMailError(err)}`,
      });
    }

    return res.json({
      success: true,
      message: "A new verification code has been sent.",
      ...otpResponse(pendingSignup),
    });
  } catch (err) {
    console.error("OTP resend failed:", err);
    return res.status(500).json({
      success: false,
      message: "Couldn't resend the verification code. Please try again.",
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/login
// -----------------------------------------------------------------------------

router.post("/login", authRateLimits.login, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  const normalizedEmail = normalizeEmail(email);

  if (!isKiitEmail(normalizedEmail)) {
    return res.status(401).json({
      success: false,
      message: "Incorrect email or password.",
    });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.verified) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password.",
      });
    }

    const validPassword = await comparePassword(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password.",
      });
    }

    user.lastLogin = new Date();
    await user.save();
    setAuthCookie(res, user);

    return res.json({
      success: true,
      message: "Login successful.",
      user: publicUser(user),
    });
  } catch (err) {
    console.error("Login failed:", err);
    return res.status(500).json({
      success: false,
      message: "Couldn't reach the database. Please try again.",
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/google
// Google is login only. It NEVER creates a new account.
// -----------------------------------------------------------------------------

router.post("/google", authRateLimits.google, async (req, res) => {
  const { idToken } = req.body || {};

  if (!idToken || typeof idToken !== "string") {
    return res.status(400).json({
      success: false,
      message: "Google authentication token is required.",
    });
  }

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    const googleEmail = decoded.email?.toLowerCase().trim();

    if (!googleEmail || !decoded.email_verified) {
      return res.status(401).json({
        success: false,
        message: "Google account email could not be verified.",
      });
    }

    if (!isKiitEmail(googleEmail)) {
      return res.status(403).json({
        success: false,
        message: "Only Google accounts using a KIIT email address are allowed.",
      });
    }

    const user = await User.findOne({ email: googleEmail });

    if (!user || !user.verified) {
      return res.status(403).json({
        success: false,
        message: "No verified KIIT account exists for this Google email. Register with email and password first.",
      });
    }

    if (user.googleUid && user.googleUid !== decoded.uid) {
      return res.status(409).json({
        success: false,
        message: "This KIIT account is already linked to a different Google account.",
      });
    }

    if (!user.googleUid) {
      user.googleUid = decoded.uid;
      user.provider = "email_google";
    }

    user.lastLogin = new Date();
    await user.save();
    setAuthCookie(res, user);

    return res.json({
      success: true,
      message: "Google login successful.",
      user: publicUser(user),
    });
  } catch (err) {
    console.error("Google authentication failed:", err);
    return res.status(401).json({
      success: false,
      message: "Google authentication failed. Please try again.",
    });
  }
});

// -----------------------------------------------------------------------------
// GET /api/auth/me
// -----------------------------------------------------------------------------

router.get("/me", requireAuth, async (req, res) => {
  return res.json({
    success: true,
    user: publicUser(req.user),
  });
});

// -----------------------------------------------------------------------------
// POST /api/auth/logout
// -----------------------------------------------------------------------------

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({
    success: true,
    message: "Logged out successfully.",
  });
});

export default router;
