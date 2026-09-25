import jwt from "jsonwebtoken";

const ADMIN_COOKIE_NAME = "board_admin_auth";

function getAdminJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET || process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET or AUTH_JWT_SECRET is missing from server/.env.");
  }
  return secret;
}

function getAdminToken(req) {
  return req.cookies?.[ADMIN_COOKIE_NAME] || null;
}

export function createAdminToken() {
  return jwt.sign(
    {
      type: "admin",
      email: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    },
    getAdminJwtSecret(),
    { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "8h" }
  );
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  };
}

export function clearAdminCookie(res) {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function requireAdmin(req, res, next) {
  try {
    const token = getAdminToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required.",
      });
    }

    const payload = jwt.verify(token, getAdminJwtSecret());
    const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (
      !payload ||
      payload.type !== "admin" ||
      !configuredEmail ||
      payload.email !== configuredEmail
    ) {
      return res.status(401).json({
        success: false,
        message: "Admin session is invalid or expired.",
      });
    }

    req.admin = { email: configuredEmail };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Admin session is invalid or expired.",
    });
  }
}

export { ADMIN_COOKIE_NAME };
