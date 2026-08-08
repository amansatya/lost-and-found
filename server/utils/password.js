import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password.
 */
export async function hashPassword(password) {
    if (
        typeof password !== "string" ||
        password.length === 0
    ) {
        throw new Error(
            "Password must be a non-empty string."
        );
    }

    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password with a bcrypt hash.
 */
export async function comparePassword(
    password,
    passwordHash
) {
    if (
        typeof password !== "string" ||
        typeof passwordHash !== "string" ||
        !passwordHash
    ) {
        return false;
    }

    return bcrypt.compare(
        password,
        passwordHash
    );
}

export { SALT_ROUNDS };