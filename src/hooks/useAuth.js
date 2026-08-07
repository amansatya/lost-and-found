import { useCallback, useState } from "react";

const STORAGE_KEY = "board_auth_user";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function loadUser() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState(loadUser);
  const [isModalOpen, setModalOpen] = useState(false);
  // Holds { name, email, password } while an OTP has been sent and we're
  // waiting on the user to enter it. Null means no signup verification
  // in progress.
  const [pendingSignup, setPendingSignup] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const openLogin = useCallback(() => setModalOpen(true), []);

  const closeLogin = useCallback(() => {
    setModalOpen(false);
    setPendingSignup(null);
    setOtpError("");
    setLoginError("");
  }, []);

  const persistUser = useCallback(({ name, email }) => {
    const displayName = name?.trim() || email.split("@")[0];
    const nextUser = { name: displayName, email, initials: initials(displayName) };
    setUser(nextUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  }, []);

  // Real login: checks email + password against the account stored in
  // MongoDB via the server's /api/login route.
  const login = useCallback(
    async ({ email, password }) => {
      setLoginLoading(true);
      setLoginError("");
      try {
        const res = await fetch(`${API_URL}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await parseJsonSafely(res);
        if (!res.ok || !data?.success) {
          setLoginError(data?.message || "Incorrect email or password.");
          return false;
        }
        persistUser(data.user);
        setModalOpen(false);
        return true;
      } catch {
        setLoginError("Couldn't reach the server. Is it running?");
        return false;
      } finally {
        setLoginLoading(false);
      }
    },
    [persistUser]
  );

  // Kicks off the signup flow: asks the server to email a 6-digit code.
  // The password travels once here, gets hashed server-side immediately,
  // and is only ever written to Mongo as that hash once the OTP checks out.
  const startSignup = useCallback(async ({ name, email, password }) => {
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await fetch(`${API_URL}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await parseJsonSafely(res);
      if (!res.ok || !data?.success) {
        setOtpError(data?.message || "Couldn't send the verification email.");
        return false;
      }
      setPendingSignup({ name, email, password });
      return true;
    } catch {
      setOtpError("Couldn't reach the server. Is it running?");
      return false;
    } finally {
      setOtpLoading(false);
    }
  }, []);

  const resendOtp = useCallback(() => {
    if (!pendingSignup) return Promise.resolve(false);
    return startSignup(pendingSignup);
  }, [pendingSignup, startSignup]);

  const verifyOtp = useCallback(
    async (code) => {
      if (!pendingSignup) return false;
      setOtpLoading(true);
      setOtpError("");
      try {
        const res = await fetch(`${API_URL}/api/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: pendingSignup.email, otp: code }),
        });
        const data = await parseJsonSafely(res);
        if (!res.ok || !data?.success) {
          setOtpError(data?.message || "Incorrect code. Please try again.");
          return false;
        }
        // The account now exists in MongoDB; use what the server saved
        // (it's the source of truth) rather than the local draft.
        persistUser(data.user || pendingSignup);
        setPendingSignup(null);
        setModalOpen(false);
        return true;
      } catch {
        setOtpError("Couldn't reach the server. Is it running?");
        return false;
      } finally {
        setOtpLoading(false);
      }
    },
    [pendingSignup, persistUser]
  );

  const cancelSignup = useCallback(() => {
    setPendingSignup(null);
    setOtpError("");
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    user,
    isModalOpen,
    openLogin,
    closeLogin,
    login,
    logout,
    pendingSignup,
    startSignup,
    verifyOtp,
    resendOtp,
    cancelSignup,
    otpLoading,
    otpError,
    loginLoading,
    loginError,
  };
}