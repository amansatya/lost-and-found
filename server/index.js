import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import authRouter from "./routes/auth.js";
import itemsRouter from "./routes/items.js";
import { OTP_CONFIG } from "./utils/otp.js";
import {
  verifyEmailTransport,
  describeMailError,
} from "./services/emailService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.join(__dirname, ".env"),
});

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/lost-and-found";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(`✓ MongoDB connected — ${MONGODB_URI}`);
  })
  .catch((err) => {
    console.error("✗ MongoDB connection failed:", err.message);
  });

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "4mb" }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/items", itemsRouter);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1,
    authentication: {
      cookie: "httpOnly",
      session: "signed-jwt",
    },
    google: {
      configured: Boolean(
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ),
    },
    otp: {
      ttlMinutes: OTP_CONFIG.ttlMinutes,
      maxAttempts: OTP_CONFIG.maxAttempts,
      maxResends: OTP_CONFIG.maxResends,
      resendCooldownSeconds: OTP_CONFIG.resendCooldownSeconds,
    },
  });
});

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

app.listen(PORT, async () => {
  console.log(`Authentication server listening on http://localhost:${PORT}`);

  try {
    await verifyEmailTransport();
    console.log("✓ Gmail auth OK — OTP email transport ready");
  } catch (err) {
    console.error(
      `✗ Gmail auth check failed: ${describeMailError(err)}\n` +
        "  OTP emails will NOT send until this is fixed."
    );
  }
});
