import User from "../models/User.js";

import {
    AUTH_COOKIE_NAME,
    verifyAuthToken,
} from "../utils/jwt.js";

/**
 * Extract the authentication cookie from
 * the request.
 *
 * cookie-parser is responsible for populating
 * req.cookies.
 */
function getAuthToken(req) {
    return req.cookies?.[AUTH_COOKIE_NAME] || null;
}

/**
 * Authentication middleware.
 *
 * This middleware requires a valid authenticated user.
 *
 * Flow:
 *
 * Cookie
 *   ↓
 * JWT verification
 *   ↓
 * User lookup
 *   ↓
 * req.user
 */
export async function requireAuth(
    req,
    res,
    next
) {
    try {
        const token =
            getAuthToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication required.",
            });
        }

        const payload =
            verifyAuthToken(token);

        if (!payload) {
            return res.status(401).json({
                success: false,
                message:
                    "Your session is invalid or expired.",
            });
        }

        const user =
            await User.findById(
                payload.sub
            );

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "User account not found.",
            });
        }

        if (!user.verified) {
            return res.status(403).json({
                success: false,
                message:
                    "This account has not been verified.",
            });
        }

        req.user = user;

        next();
    } catch (err) {
        console.error(
            "Authentication middleware error:",
            err.message
        );

        return res.status(401).json({
            success: false,
            message:
                "Authentication failed.",
        });
    }
}