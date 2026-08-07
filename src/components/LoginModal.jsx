import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../hooks/AuthContext";

const OTP_LENGTH = 6;

export default function LoginModal() {
  const {
    isModalOpen,
    closeLogin,
    login,
    pendingSignup,
    startSignup,
    verifyOtp,
    resendOtp,
    cancelSignup,
    otpLoading,
    otpError,
    loginLoading,
    loginError,
  } = useAuthContext();

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isModalOpen) {
      setMode("login");
      setName("");
      setEmail("");
      setPassword("");
      setFormError("");
    }
  }, [isModalOpen]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") closeLogin();
    }
    if (isModalOpen) {
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
  }, [isModalOpen, closeLogin]);

  if (!isModalOpen) return null;

  const showOtpStep = Boolean(pendingSignup);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!email.trim() || !password.trim()) {
      setFormError("Please fill in both email and password.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setFormError("Please tell us your name.");
      return;
    }

    if (mode === "login") {
      await login({ email: email.trim(), password });
      return;
    }

    // Signup: send an OTP to the given email before creating the account.
    await startSignup({ name: name.trim(), email: email.trim(), password });
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeLogin();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          className="modal__close"
          aria-label="Close"
          onClick={closeLogin}
        >
          ×
        </button>

        <div className="modal__pin" aria-hidden="true" />

        {showOtpStep ? (
          <OtpStep
            email={pendingSignup.email}
            loading={otpLoading}
            error={otpError}
            onVerify={verifyOtp}
            onResend={resendOtp}
            onBack={cancelSignup}
          />
        ) : (
          <>
            <h2 id="auth-modal-title" className="modal__title">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="modal__subtitle">
              {mode === "login"
                ? "Log in to post and manage your listings on The Board."
                : "Sign up to report lost or found items in seconds."}
            </p>

            <form className="modal__form" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <label className="field">
                  <span className="field__label">College Roll-No</span>
                  <input
                    className="field__input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Lee"
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="field">
                <span className="field__label">College Email</span>
                <input
                  className="field__input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  autoComplete="email"
                />
              </label>

              <label className="field">
                <span className="field__label">Password</span>
                <input
                  className="field__input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </label>

              {(formError ||
                (mode === "signup" && otpError) ||
                (mode === "login" && loginError)) && (
                <p className="modal__error">
                  {formError || (mode === "login" ? loginError : otpError)}
                </p>
              )}

              <button
                type="submit"
                className="btn btn--navy btn--submit"
                disabled={mode === "login" ? loginLoading : otpLoading}
              >
                {mode === "login"
                  ? loginLoading
                    ? "Logging in…"
                    : "Log In"
                  : otpLoading
                  ? "Sending code…"
                  : "Sign Up"}
              </button>
            </form>

            <p className="modal__switch">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => setMode("signup")}>
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => setMode("login")}>
                    Log in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function OtpStep({ email, loading, error, onVerify, onResend, onBack }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [resendCooldown, setResendCooldown] = useState(30);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  function updateDigit(index, value) {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    text
      .slice(0, OTP_LENGTH)
      .split("")
      .forEach((char, i) => (next[i] = char));
    setDigits(next);
    const lastFilled = Math.min(text.length, OTP_LENGTH) - 1;
    inputRefs.current[Math.max(lastFilled, 0)]?.focus();
  }

  const code = digits.join("");
  const isComplete = code.length === OTP_LENGTH;

  async function handleVerify(e) {
    e?.preventDefault();
    if (!isComplete || loading) return;
    await onVerify(code);
  }

  async function handleResend() {
    if (resendCooldown > 0 || loading) return;
    setDigits(Array(OTP_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
    await onResend();
    setResendCooldown(30);
  }

  return (
    <>
      <h2 className="modal__title">Check your email</h2>
      <p className="modal__subtitle">
        We sent a 6-digit verification code to <strong>{email}</strong>. Enter
        it below to finish creating your account.
      </p>

      <form className="modal__form" onSubmit={handleVerify}>
        <div className="otp-inputs" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              className="otp-inputs__box"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => updateDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
            />
          ))}
        </div>

        {error && <p className="modal__error">{error}</p>}

        <button
          type="submit"
          className="btn btn--navy btn--submit"
          disabled={!isComplete || loading}
        >
          {loading ? "Verifying…" : "Verify & Create Account"}
        </button>
      </form>

      <p className="modal__switch">
        Didn&apos;t get a code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || loading}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
      </p>
      <p className="modal__switch">
        <button type="button" onClick={onBack}>
          ← Back
        </button>
      </p>
    </>
  );
}