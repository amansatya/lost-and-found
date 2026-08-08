import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../hooks/AuthContext";
import { isKiitEmail, validatePassword } from "../utils/validation";

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
    loginWithGoogle,
    otpLoading,
    otpError,
    loginLoading,
    loginError,
    googleLoading,
    googleError,
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
    if (!isModalOpen) return;

    function onKeyDown(e) {
      if (e.key === "Escape") closeLogin();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, closeLogin]);

  if (!isModalOpen) return null;

  const showOtpStep = Boolean(pendingSignup);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "signup" && !name.trim()) {
      setFormError("Please enter your full name.");
      return;
    }

    if (!normalizedEmail) {
      setFormError("Please enter your KIIT email address.");
      return;
    }

    if (!isKiitEmail(normalizedEmail)) {
      setFormError("Use your official @kiit.ac.in email address.");
      return;
    }

    if (!password) {
      setFormError("Please enter your password.");
      return;
    }

    if (mode === "signup") {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setFormError(passwordError);
        return;
      }

      await startSignup({
        name: name.trim(),
        email: normalizedEmail,
        password,
      });
      return;
    }

    await login({
      email: normalizedEmail,
      password,
    });
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setFormError("");
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
          aria-label="Close authentication dialog"
          onClick={closeLogin}
        >
          ×
        </button>

        <div className="modal__pin" aria-hidden="true" />

        {showOtpStep ? (
          <OtpStep
            pendingSignup={pendingSignup}
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
                ? "Use your KIIT email and password, or sign in with the Google account linked to your KIIT account."
                : "Create your campus account with your name, KIIT email and password. We’ll verify your email before activating it."}
            </p>

            <form className="modal__form" onSubmit={handleSubmit} noValidate>
              {mode === "signup" && (
                <label className="field">
                  <span className="field__label">Full name</span>
                  <input
                    className="field__input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jhon Doe"
                    autoComplete="name"
                    autoFocus
                    maxLength={80}
                  />
                </label>
              )}

              <label className="field">
                <span className="field__label">KIIT email</span>
                <input
                  className="field__input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@kiit.ac.in"
                  autoComplete="email"
                  autoFocus={mode === "login"}
                />
                {mode === "signup" && (
                  <span className="field__hint">
                    Only official KIIT email addresses can register.
                  </span>
                )}
              </label>

              <label className="field">
                <span className="field__label">Password</span>
                <input
                  className="field__input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                {mode === "signup" && (
                  <span className="field__hint">
                    Use at least 6 characters.
                  </span>
                )}
              </label>

              {(formError || (mode === "signup" ? otpError : loginError)) && (
                <p className="modal__error" role="alert">
                  {formError || (mode === "signup" ? otpError : loginError)}
                </p>
              )}

              <button
                type="submit"
                className="btn btn--navy btn--submit"
                disabled={mode === "login" ? loginLoading : otpLoading}
              >
                {mode === "login"
                  ? loginLoading
                    ? "Checking your account…"
                    : "Log in"
                  : otpLoading
                  ? "Sending verification code…"
                  : "Create account"}
              </button>
            </form>

            {mode === "login" && (
              <>
                <div className="modal__divider">OR</div>

                <button
                  type="button"
                  className="btn btn--google"
                  onClick={loginWithGoogle}
                  disabled={googleLoading}
                >
                  <GoogleIcon />
                  {googleLoading ? "Connecting to Google…" : "Continue with Google"}
                </button>

                {googleError && (
                  <p className="modal__error modal__error--spaced" role="alert">
                    {googleError}
                  </p>
                )}
              </>
            )}

            <p className="modal__switch">
              {mode === "login" ? (
                <>
                  New to The Board?{" "}
                  <button type="button" onClick={() => switchMode("signup")}>
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button type="button" onClick={() => switchMode("login")}>
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

function OtpStep({
  pendingSignup,
  loading,
  error,
  onVerify,
  onResend,
  onBack,
}) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [now, setNow] = useState(Date.now());
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expiryMs = pendingSignup?.expiresAt
    ? new Date(pendingSignup.expiresAt).getTime()
    : 0;
  const resendAtMs = pendingSignup?.resendAvailableAt
    ? new Date(pendingSignup.resendAvailableAt).getTime()
    : 0;

  const expiresInSeconds = Math.max(0, Math.ceil((expiryMs - now) / 1000));
  const resendWaitSeconds = Math.max(0, Math.ceil((resendAtMs - now) / 1000));
  const remainingAttempts = pendingSignup?.remainingAttempts ?? 3;
  const remainingResends = pendingSignup?.remainingResends ?? 0;

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

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

    text.slice(0, OTP_LENGTH).split("").forEach((char, i) => {
      next[i] = char;
    });

    setDigits(next);

    const lastFilled = Math.min(text.length, OTP_LENGTH) - 1;
    inputRefs.current[Math.max(lastFilled, 0)]?.focus();
  }

  async function handleVerify(e) {
    e.preventDefault();
    const code = digits.join("");

    if (
      code.length !== OTP_LENGTH ||
      loading ||
      expiresInSeconds === 0 ||
      remainingAttempts === 0
    ) {
      return;
    }

    await onVerify(code);
  }

  async function handleResend() {
    if (resendWaitSeconds > 0 || remainingResends <= 0 || loading) return;

    setDigits(Array(OTP_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
    await onResend();
  }

  return (
    <>
      <h2 className="modal__title">Verify your email</h2>

      <p className="modal__subtitle">
        We sent a 6-digit code to <strong>{pendingSignup.email}</strong>.
        Enter it below to finish creating your account.
      </p>

      <div className="modal__otp-meta">
        <span>
          Code expires in <strong>{formatTime(expiresInSeconds)}</strong>
        </span>
        <span>
          {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} left
        </span>
      </div>

      <form className="modal__form" onSubmit={handleVerify} noValidate>
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
              disabled={
                loading ||
                expiresInSeconds === 0 ||
                remainingAttempts === 0
              }
            />
          ))}
        </div>

        {error && (
          <p className="modal__error" role="alert">
            {error}
          </p>
        )}

        {expiresInSeconds === 0 && (
          <p className="modal__error" role="alert">
            This code has expired. Request a new code to continue.
          </p>
        )}

        <button
          type="submit"
          className="btn btn--navy btn--submit"
          disabled={
            digits.join("").length !== OTP_LENGTH ||
            loading ||
            expiresInSeconds === 0 ||
            remainingAttempts === 0
          }
        >
          {loading ? "Verifying code…" : "Verify and create account"}
        </button>
      </form>

      <p className="modal__switch">
        Didn&apos;t receive the code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendWaitSeconds > 0 || remainingResends <= 0 || loading}
        >
          {remainingResends <= 0
            ? "No resends remaining"
            : resendWaitSeconds > 0
            ? `Resend in ${resendWaitSeconds}s`
            : `Send a new code (${remainingResends} left)`}
        </button>
      </p>

      <p className="modal__switch">
        <button type="button" onClick={onBack} disabled={loading}>
          ← Change registration details
        </button>
      </p>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 12.27c0-.78-.07-1.53-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
      />
      <path
        fill="currentColor"
        d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-4.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.75Z"
      />
      <path
        fill="currentColor"
        d="M6.54 13.83A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.31-1.83V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.53Z"
      />
      <path
        fill="currentColor"
        d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.25 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53C7.31 7.86 9.46 6.14 12 6.14Z"
      />
    </svg>
  );
}
