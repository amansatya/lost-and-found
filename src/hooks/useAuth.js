import { useCallback, useEffect, useState } from "react";
import { getIdToken, signInWithPopup, signOut } from "firebase/auth";

import { auth, googleProvider } from "../lib/firebase";
import { authApi } from "../services/authApi";
import { isKiitEmail, validatePassword } from "../utils/validation";

function initials(name, email = "") {
  const source = name?.trim() || email.split("@")[0] || "U";
  return source.charAt(0).toUpperCase();
}

function normalizeUser(user) {
  if (!user) return null;
  const name = user.name?.trim() || user.email?.split("@")[0] || "KIIT User";
  return {
    ...user,
    name,
    initials: initials(name, user.email),
  };
}

function errorMessage(error, fallback) {
  if (!error) return fallback;

  const message = error.message || "";

  if (error.status === 409) return message;
  if (error.status === 429) return message;
  if (error.status === 403) return message;
  if (error.status === 401) return message;

  const firebaseMessages = {
    "auth/popup-closed-by-user": "Google sign-in was cancelled. You can try again whenever you're ready.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.",
    "auth/cancelled-popup-request": "Another Google sign-in window is already open.",
    "auth/network-request-failed": "Google couldn't connect right now. Check your internet connection and try again.",
    "auth/too-many-requests": "Google has temporarily limited sign-in attempts. Please wait a little and try again.",
  };

  for (const [code, friendlyMessage] of Object.entries(firebaseMessages)) {
    if (message.includes(code)) return friendlyMessage;
  }

  return message || fallback;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);

  const [pendingSignup, setPendingSignup] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  const setAuthenticatedUser = useCallback((nextUser) => {
    setUser(normalizeUser(nextUser));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.me();
      setAuthenticatedUser(data.user);
      return data.user;
    } catch (error) {
      if (error?.status !== 401) {
        console.error("Unable to restore authentication session:", error);
      }
      setUser(null);
      return null;
    }
  }, [setAuthenticatedUser]);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const data = await authApi.me();
        if (active) setAuthenticatedUser(data.user);
      } catch (error) {
        if (active) {
          if (error?.status !== 401) {
            console.error("Unable to restore authentication session:", error);
          }
          setUser(null);
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, [setAuthenticatedUser]);

  const openLogin = useCallback(() => {
    setLoginError("");
    setGoogleError("");
    setOtpError("");
    setModalOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setModalOpen(false);
    setPendingSignup(null);
    setOtpError("");
    setLoginError("");
    setGoogleError("");
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      setLoginLoading(true);
      setLoginError("");

      try {
        const normalizedEmail = email.trim().toLowerCase();

        if (!isKiitEmail(normalizedEmail)) {
          setLoginError("Please use your @kiit.ac.in email address.");
          return false;
        }

        const data = await authApi.login(normalizedEmail, password);
        setAuthenticatedUser(data.user);
        setModalOpen(false);
        return true;
      } catch (error) {
        setLoginError(errorMessage(error, "Incorrect email or password."));
        return false;
      } finally {
        setLoginLoading(false);
      }
    },
    [setAuthenticatedUser]
  );

  const startSignup = useCallback(async ({ name, email, password }) => {
    setOtpLoading(true);
    setOtpError("");

    try {
      const normalizedName = name?.trim() || "";

      if (normalizedName.length < 2) {
        setOtpError("Please enter your name (at least 2 characters).");
        return false;
      }

      if (normalizedName.length > 80) {
        setOtpError("Name must be 80 characters or fewer.");
        return false;
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!isKiitEmail(normalizedEmail)) {
        setOtpError("Registration is only available with a @kiit.ac.in email address.");
        return false;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setOtpError(passwordError);
        return false;
      }

      const data = await authApi.signup(normalizedName, normalizedEmail, password);

      setPendingSignup({
        name: normalizedName,
        email: normalizedEmail,
        expiresAt: data.expiresAt,
        remainingAttempts: data.remainingAttempts,
        remainingResends: data.remainingResends,
        resendAvailableAt: data.resendAvailableAt,
      });

      return true;
    } catch (error) {
      setOtpError(errorMessage(error, "Couldn't send the verification email."));
      return false;
    } finally {
      setOtpLoading(false);
    }
  }, []);

  const resendOtp = useCallback(async () => {
    if (!pendingSignup) return false;

    setOtpLoading(true);
    setOtpError("");

    try {
      const data = await authApi.resendOtp(pendingSignup.email);

      setPendingSignup((current) => ({
        ...current,
        expiresAt: data.expiresAt,
        remainingAttempts: data.remainingAttempts,
        remainingResends: data.remainingResends,
        resendAvailableAt: data.resendAvailableAt,
      }));

      return true;
    } catch (error) {
      setOtpError(errorMessage(error, "Couldn't resend the verification code."));
      return false;
    } finally {
      setOtpLoading(false);
    }
  }, [pendingSignup]);

  const verifyOtp = useCallback(
    async (code) => {
      if (!pendingSignup) return false;

      setOtpLoading(true);
      setOtpError("");

      try {
        const data = await authApi.verifyOtp(pendingSignup.email, code);
        setAuthenticatedUser(data.user);
        setPendingSignup(null);
        setModalOpen(false);
        return true;
      } catch (error) {
        const data = error?.data;

        if (data?.remainingAttempts !== undefined) {
          setPendingSignup((current) =>
            current
              ? {
                  ...current,
                  remainingAttempts: data.remainingAttempts,
                  expiresAt: data.expiresAt || current.expiresAt,
                }
              : current
          );
        }

        if (data?.remainingAttempts === 0) {
          setPendingSignup(null);
        }

        setOtpError(errorMessage(error, "Incorrect verification code."));
        return false;
      } finally {
        setOtpLoading(false);
      }
    },
    [pendingSignup, setAuthenticatedUser]
  );

  const cancelSignup = useCallback(() => {
    setPendingSignup(null);
    setOtpError("");
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setGoogleLoading(true);
    setGoogleError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      if (!googleUser.email || !isKiitEmail(googleUser.email)) {
        await signOut(auth);
        setGoogleError("Only Google accounts using your @kiit.ac.in email are allowed.");
        return false;
      }

      const idToken = await getIdToken(googleUser, true);
      const data = await authApi.google(idToken);

      setAuthenticatedUser(data.user);
      await signOut(auth);
      setModalOpen(false);
      return true;
    } catch (error) {
      try {
        await signOut(auth);
      } catch {
        // Ignore Firebase cleanup errors.
      }

      setGoogleError(
        errorMessage(
          error,
          "Google login failed. Register with your KIIT email first if you do not already have an account."
        )
      );
      return false;
    } finally {
      setGoogleLoading(false);
    }
  }, [setAuthenticatedUser]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setUser(null);
      setPendingSignup(null);
      setOtpError("");
      setLoginError("");
      setGoogleError("");
      setModalOpen(false);

      try {
        await signOut(auth);
      } catch {
        // The application session is already cleared server-side/client-side.
      }
    }
  }, []);

  return {
    user,
    loading: authLoading,
    authLoading,
    isAuthenticated: Boolean(user),

    isModalOpen,
    openLogin,
    closeLogin,

    login,
    startSignup,
    signup: startSignup,
    verifyOtp,
    resendOtp,
    loginWithGoogle,
    logout,
    refreshUser,
    cancelSignup,

    pendingSignup,
    otpLoading,
    otpError,
    loginLoading,
    loginError,
    googleLoading,
    googleError,
  };
}
