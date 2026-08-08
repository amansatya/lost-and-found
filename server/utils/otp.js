import crypto from "node:crypto";

const OTP_LENGTH = 6;

// OTP is valid for 10 minutes.
const OTP_TTL_MS = 10 * 60 * 1000;

// Maximum incorrect verification attempts for one OTP.
const MAX_OTP_ATTEMPTS = 3;

// Maximum resend operations after the initial OTP.
const MAX_RESENDS = 3;

// Prevent repeated OTP requests every few milliseconds.
const RESEND_COOLDOWN_MS = 30 * 1000;

/**
 * Get the secret used to HMAC OTPs.
 */
function getOtpHashSecret() {
    const secret = process.env.OTP_HASH_SECRET;

    if (!secret) {
        throw new Error(
            "OTP_HASH_SECRET is missing from server/.env."
        );
    }

    return secret;
}

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
export function generateOtp() {
    const minimum = 10 ** (OTP_LENGTH - 1);
    const maximum = 10 ** OTP_LENGTH;

    return String(
        crypto.randomInt(minimum, maximum)
    );
}

/**
 * Hash an OTP using HMAC-SHA256.
 *
 * We never store the plaintext OTP.
 */
export function hashOtp(otp) {
    if (
        typeof otp !== "string" ||
        !/^\d{6}$/.test(otp)
    ) {
        throw new Error(
            "OTP must be a 6-digit string."
        );
    }

    return crypto
        .createHmac(
            "sha256",
            getOtpHashSecret()
        )
        .update(otp)
        .digest("hex");
}

/**
 * Safely compare an OTP against its stored hash.
 */
export function verifyOtp(
    otp,
    storedHash
) {
    if (
        typeof otp !== "string" ||
        typeof storedHash !== "string" ||
        !/^\d{6}$/.test(otp)
    ) {
        return false;
    }

    const candidateHash = hashOtp(otp);

    const candidateBuffer =
        Buffer.from(candidateHash, "hex");

    const storedBuffer =
        Buffer.from(storedHash, "hex");

    if (
        candidateBuffer.length !==
        storedBuffer.length
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        candidateBuffer,
        storedBuffer
    );
}

/**
 * Return the expiration Date for a new OTP.
 */
export function getOtpExpiration(
    from = Date.now()
) {
    const timestamp =
        from instanceof Date
            ? from.getTime()
            : from;

    return new Date(
        timestamp + OTP_TTL_MS
    );
}

/**
 * Check whether an OTP has expired.
 */
export function isOtpExpired(
    expiresAt
) {
    return (
        Date.now() >=
        new Date(expiresAt).getTime()
    );
}

/**
 * Check whether another OTP verification
 * attempt is allowed.
 */
export function canAttemptOtp(
    attempts
) {
    return (
        Number(attempts) <
        MAX_OTP_ATTEMPTS
    );
}

/**
 * Number of verification attempts remaining.
 */
export function getRemainingOtpAttempts(
    attempts
) {
    return Math.max(
        0,
        MAX_OTP_ATTEMPTS -
        Number(attempts)
    );
}

/**
 * Check whether another resend is allowed.
 */
export function canResendOtp(
    resendCount
) {
    return (
        Number(resendCount) <
        MAX_RESENDS
    );
}

/**
 * Number of resends remaining.
 */
export function getRemainingResends(
    resendCount
) {
    return Math.max(
        0,
        MAX_RESENDS -
        Number(resendCount)
    );
}

/**
 * Check whether the resend cooldown has passed.
 */
export function canSendOtpAgain(
    lastSentAt
) {
    if (!lastSentAt) {
        return true;
    }

    return (
        Date.now() -
        new Date(
            lastSentAt
        ).getTime() >=
        RESEND_COOLDOWN_MS
    );
}

/**
 * Number of seconds remaining in
 * the resend cooldown.
 */
export function getResendWaitSeconds(
    lastSentAt
) {
    if (!lastSentAt) {
        return 0;
    }

    const elapsed =
        Date.now() -
        new Date(
            lastSentAt
        ).getTime();

    const remaining = Math.max(
        0,
        RESEND_COOLDOWN_MS -
        elapsed
    );

    return Math.ceil(
        remaining / 1000
    );
}

export const OTP_CONFIG =
    Object.freeze({
        length: OTP_LENGTH,

        ttlMs: OTP_TTL_MS,

        ttlMinutes:
            OTP_TTL_MS / 60_000,

        maxAttempts:
        MAX_OTP_ATTEMPTS,

        maxResends:
        MAX_RESENDS,

        resendCooldownMs:
        RESEND_COOLDOWN_MS,

        resendCooldownSeconds:
            RESEND_COOLDOWN_MS /
            1000,
    });