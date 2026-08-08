import mongoose from "mongoose";

const pendingSignupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        // Bcrypt hash of the password supplied during registration.
        passwordHash: {
            type: String,
            required: true,
        },

        // HMAC-SHA256 hash of the OTP.
        // The actual OTP is never stored in MongoDB.
        otpHash: {
            type: String,
            required: true,
        },

        // Number of incorrect attempts against the current OTP.
        attempts: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Number of resends after the initial OTP.
        //
        // 0 = initial OTP
        // 1 = first resend
        // 2 = second resend
        // 3 = third resend
        //
        // No more resends after 3.
        resendCount: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Current OTP expiration time.
        expiresAt: {
            type: Date,
            required: true,
        },

        // Used to enforce the resend cooldown.
        lastSentAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Automatically clean expired pending signup records.
// The authentication code will ALSO explicitly check expiresAt.
// MongoDB TTL is only cleanup; it is not the security check.
pendingSignupSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

const PendingSignup = mongoose.model(
    "PendingSignup",
    pendingSignupSchema
);

export default PendingSignup;