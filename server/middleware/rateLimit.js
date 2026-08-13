const buckets = new Map();

function getClientKey(req) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function createRateLimiter({
                                    windowMs,
                                    max,
                                    message = "Too many requests. Please try again later.",
                                  }) {
  return (req, res, next) => {
    const key = `${req.baseUrl || ""}:${req.path}:${getClientKey(req)}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || now >= current.resetAt) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });

      return next();
    }

    if (current.count >= max) {
      const retryAfterSeconds = Math.ceil(
          (current.resetAt - now) / 1000
      );

      res.set("Retry-After", String(retryAfterSeconds));

      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    }

    current.count += 1;

    return next();
  };
}

export const authRateLimits = {
  signup: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many signup attempts. Please try again later.",
  }),

  verifyOtp: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 12,
    message: "Too many verification requests. Please try again later.",
  }),

  resendOtp: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 6,
    message: "Too many OTP resend requests. Please try again later.",
  }),

  login: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many login attempts. Please try again later.",
  }),

  google: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many Google login attempts. Please try again later.",
  }),

  forgotPassword: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many password reset requests. Please try again later.",
  }),

  resetPassword: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 12,
    message:
        "Too many password reset verification attempts. Please try again later.",
  }),

  resendResetOtp: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 6,
    message:
        "Too many password reset resend requests. Please try again later.",
  }),
};