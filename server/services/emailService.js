import nodemailer from "nodemailer";

import { OTP_CONFIG } from "../utils/otp.js";

let transporter = null;

function getCredentials() {
  const user = (process.env.GMAIL_USER || "").trim();
  const password = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

  if (!user || !password) {
    throw new Error(
      "GMAIL_USER and/or GMAIL_APP_PASSWORD is missing. Check server/.env."
    );
  }

  return { user, password };
}

function getTransporter() {
  if (transporter) return transporter;

  const { user, password } = getCredentials();

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass: password,
    },
  });

  return transporter;
}

export async function sendSignupOtpEmail(email, code) {
  const mailer = getTransporter();
  const { user } = getCredentials();

  await mailer.sendMail({
    from: `"The Board" <${user}>`,
    to: email,
    subject: "Verify your KIIT email — The Board",
    text:
      `Your verification code for The Board is ${code}.\n\n` +
      `This code is valid for ${OTP_CONFIG.ttlMinutes} minutes.\n\n` +
      "If you did not request this code, you can ignore this email.",
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:420px;margin:40px auto;padding:24px;border:1px solid #eaecf0;border-radius:12px">
        <h2 style="margin:0 0 16px;color:#101828">Verify your KIIT email</h2>
        <p style="color:#475467;font-size:14px;line-height:1.6">
          Use the following verification code to complete your registration:
        </p>
        <div style="margin:24px 0;padding:16px;text-align:center;background:#f2f4f7;border-radius:8px">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#155eef">
            ${code}
          </span>
        </div>
        <p style="color:#475467;font-size:13px;line-height:1.6">
          This code expires in <strong>${OTP_CONFIG.ttlMinutes} minutes</strong>.
        </p>
        <p style="color:#98a2b3;font-size:12px">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetOtpEmail(email, code) {
  const mailer = getTransporter();
  const { user } = getCredentials();

  await mailer.sendMail({
    from: `"The Board" <${user}>`,
    to: email,
    subject: "Reset your password — The Board",
    text:
      `Your password reset code for The Board is ${code}.\n\n` +
      `This code is valid for ${OTP_CONFIG.ttlMinutes} minutes.\n\n` +
      "If you did not request a password reset, you can safely ignore this email.",
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:420px;margin:40px auto;padding:24px;border:1px solid #eaecf0;border-radius:12px">
        <h2 style="margin:0 0 16px;color:#101828">Reset your password</h2>
        <p style="color:#475467;font-size:14px;line-height:1.6">
          Use the following verification code to reset your The Board password:
        </p>
        <div style="margin:24px 0;padding:16px;text-align:center;background:#f2f4f7;border-radius:8px">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#155eef">
            ${code}
          </span>
        </div>
        <p style="color:#475467;font-size:13px;line-height:1.6">
          This code expires in <strong>${OTP_CONFIG.ttlMinutes} minutes</strong> and allows up to <strong>${OTP_CONFIG.maxAttempts} attempts</strong>.
        </p>
        <p style="color:#98a2b3;font-size:12px">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function verifyEmailTransport() {
  await getTransporter().verify();
  return true;
}

export function describeMailError(err) {
  const code = err?.code || err?.responseCode;

  if (err?.message?.includes("GMAIL_USER")) {
    return err.message;
  }

  if (code === "EAUTH" || err?.responseCode === 535) {
    return (
      "Gmail rejected the login. Make sure GMAIL_APP_PASSWORD is a valid " +
      "16-character App Password and 2-Step Verification is enabled."
    );
  }

  if (code === "ESOCKET" || code === "ETIMEDOUT" || code === "ECONNECTION") {
    return "Couldn't reach Gmail's servers. Check your network connection/firewall.";
  }

  return err?.message || "Unknown email error.";
}
