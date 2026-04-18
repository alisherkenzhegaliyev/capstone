import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";


export default function LoginPage() {
  const { isAuthenticated, login, signUp, verifyEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationDigits, setVerificationDigits] = useState<string[]>(
    Array.from({ length: 6 }, () => ""),
  );
  const [showVerificationStep, setShowVerificationStep] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname ?? "/";
  const verificationCode = useMemo(() => verificationDigits.join(""), [verificationDigits]);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "signin") {
        await login(email, password);
        navigate(from, { replace: true });
        return;
      }

      const response = await signUp(email, password);
      setVerificationEmail(response.email);
      setVerificationDigits(Array.from({ length: 6 }, () => ""));
      setShowVerificationStep(true);
      setNotice("Account created. Enter the 6-digit verification code to continue.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "We couldn't complete that request.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      await verifyEmail(verificationEmail, verificationCode);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid verification code.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (!digitsOnly) {
      setVerificationDigits((current) => {
        const next = [...current];
        next[index] = "";
        return next;
      });
      return;
    }

    setVerificationDigits((current) => {
      const next = [...current];
      let targetIndex = index;

      for (const digit of digitsOnly.slice(0, 6 - index)) {
        next[targetIndex] = digit;
        targetIndex += 1;
      }

      return next;
    });

    const nextFocusIndex = Math.min(index + digitsOnly.length, 5);
    window.requestAnimationFrame(() => {
      const nextInput = document.getElementById(`verification-digit-${nextFocusIndex}`);
      nextInput?.focus();
    });
  };

  const handleDigitKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !verificationDigits[index] && index > 0) {
      const previousInput = document.getElementById(`verification-digit-${index - 1}`);
      previousInput?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#fef3c7] px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-500">
            Capstone Access
          </p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">
            {showVerificationStep
              ? "Verify your email"
              : mode === "signup"
                ? "Create your account"
                : "Sign in to continue"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {showVerificationStep
              ? "We sent a 6-digit verification code to your email address."
              : mode === "signup"
                ? "Create an account with your email and password to get started."
                : "Sign in with your verified email and password."}
          </p>
        </div>

        {showVerificationStep ? (
          <form onSubmit={handleVerify} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={verificationEmail}
                onChange={(event) => setVerificationEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                required
              />
            </label>

            <label className="block">
              <span className="mb-3 block text-sm font-medium text-slate-700">
                Verification code
              </span>
              <div className="flex items-center justify-between gap-2">
                {verificationDigits.map((digit, index) => (
                  <input
                    key={index}
                    id={`verification-digit-${index}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={digit}
                    onChange={(event) => handleDigitChange(index, event.target.value)}
                    onKeyDown={(event) => handleDigitKeyDown(index, event)}
                    className="h-14 w-12 rounded-2xl border border-slate-300 text-center text-xl font-bold text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    aria-label={`Verification digit ${index + 1}`}
                    required
                  />
                ))}
              </div>
            </label>

            {notice ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {notice}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {loading ? "Verifying..." : "Verify email"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowVerificationStep(false);
                setMode("signin");
                setVerificationDigits(Array.from({ length: 6 }, () => ""));
                setNotice("");
                setError("");
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-200 p-1 text-sm font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setNotice("");
                }}
                className={`rounded-xl px-4 py-2 transition ${
                  mode === "signup" ? "bg-white shadow-sm" : "text-slate-500"
                }`}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setNotice("");
                }}
                className={`rounded-xl px-4 py-2 transition ${
                  mode === "signin" ? "bg-white shadow-sm" : "text-slate-500"
                }`}
              >
                Sign in
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  placeholder="dr.maya.kim@northstar-clinic.test"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  placeholder="Enter password"
                  required
                />
              </label>

              {notice ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {loading
                  ? mode === "signup"
                    ? "Creating account..."
                    : "Signing in..."
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
