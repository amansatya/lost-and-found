import jwt from "jsonwebtoken";

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET;

  if (!secret) {
    throw new Error("AUTH_JWT_SECRET is missing from server/.env.");
  }

  return secret;
}

function getJwtExpiresIn() {
  return process.env.AUTH_JWT_EXPIRES_IN || "7d";
}

export function createAuthToken(user) {
  if (!user?._id) {
    throw new Error("Cannot create auth token without a user ID.");
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      type: "auth",
    },
    getJwtSecret(),
    {
      expiresIn: getJwtExpiresIn(),
    }
  );
}

export function verifyAuthToken(token) {
  if (!token) return null;

  try {
    const payload = jwt.verify(token, getJwtSecret());

    if (!payload || payload.type !== "auth" || !payload.sub) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE_NAME = "board_auth";

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function getAuthCookieOptions() {
  return { ...AUTH_COOKIE_OPTIONS };
}
