import React, { useState, useRef, useEffect } from "react";
import { useAppContext } from "../context/appContext";

// ─── Step indicators ─────────────────────────────────────────────────────────
const steps = ["Account", "Verify", "Done"];

const StepDot = ({ active, done, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
        done
          ? "bg-indigo-600 text-white"
          : active
          ? "bg-white border-2 border-indigo-600 text-indigo-600"
          : "bg-gray-200 text-gray-400"
      }`}
    >
      {done ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        steps.indexOf(label) + 1
      )}
    </div>
    <span className={`text-xs font-medium ${active || done ? "text-indigo-600" : "text-gray-400"}`}>{label}</span>
  </div>
);

// ─── Reusable input ───────────────────────────────────────────────────────────
const Field = ({ label, type = "text", value, onChange, placeholder, autoComplete }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required
      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition text-gray-900 placeholder-gray-400"
    />
  </div>
);

// ─── Main Auth Page ───────────────────────────────────────────────────────────
const Auth = () => {
  const { axios, navigate, login, toast } = useAppContext();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [step, setStep] = useState(0); // 0=form, 1=otp, 2=done

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP fields (6 individual digits)
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer for "Resend OTP"
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // ── OTP input helpers ──────────────────────────────────────────────────────
  const handleOtpChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = [...otp];
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  // ── Submit handlers ────────────────────────────────────────────────────────
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        const { data } = await axios.post("/api/auth/register", { name, email, password });
        if (data.success) {
          toast.success("OTP sent to your email!");
          setStep(1);
          setResendCooldown(60);
        } else {
          toast.error(data.message);
        }
      } else {
        const { data } = await axios.post("/api/auth/login", { email, password });
        if (data.success) {
          login(data.user);
          setStep(2);
          setTimeout(() => navigate("/"), 1500);
        } else if (data.needsOtp) {
          toast.error(data.message);
          setStep(1);
          setResendCooldown(60);
        } else {
          toast.error(data.message);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return toast.error("Please enter the full 6-digit code");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/verify-otp", { email, otp: code });
      if (data.success) {
        login(data.user);
        setStep(2);
        toast.success("Email verified! Welcome to StayHub 🎉");
        setTimeout(() => navigate("/"), 1500);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const { data } = await axios.post("/api/auth/resend-otp", { email });
      if (data.success) {
        toast.success("New OTP sent!");
        setResendCooldown(60);
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
      {/* Glowing background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 space-y-6">
          {/* Logo / Brand */}
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">StayHub</h1>
            <p className="text-gray-500 text-sm mt-1">Your home away from home</p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-3">
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <StepDot label={s} active={step === i} done={step > i} />
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded transition-all duration-500 ${step > i ? "bg-indigo-600" : "bg-gray-200"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Step 0: Login / Register form ─────────────────────────────── */}
          {step === 0 && (
            <>
              {/* Mode tabs */}
              <div className="flex bg-gray-100 rounded-2xl p-1">
                {["login", "register"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      mode === m ? "bg-white shadow text-indigo-700" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {m === "login" ? "Sign In" : "Create Account"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {mode === "register" && (
                  <Field
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    autoComplete="name"
                  />
                )}
                <Field
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      required
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition text-gray-900 placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Processing…
                    </span>
                  ) : mode === "login" ? (
                    "Sign In"
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  {mode === "login" ? "Register" : "Sign In"}
                </button>
              </p>
            </>
          )}

          {/* ── Step 1: OTP verification ───────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900">Check your inbox</h2>
                <p className="text-gray-500 text-sm mt-1">
                  We sent a 6-digit code to <span className="font-medium text-slate-700">{email}</span>
                </p>
              </div>

              {/* 6 OTP boxes */}
              <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    onKeyDown={(e) => handleOtpKeyDown(e, i)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
                      border-gray-200 bg-gray-50 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100
                      text-slate-900 caret-transparent"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Verifying…
                  </span>
                ) : (
                  "Verify Code"
                )}
              </button>

              <div className="text-center text-sm text-gray-500">
                Didn't receive it?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-indigo-600 font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setStep(0); setOtp(["", "", "", "", "", ""]); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition"
              >
                ← Back to {mode === "register" ? "registration" : "sign in"}
              </button>
            </form>
          )}

          {/* ── Step 2: Success ────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">You're in!</h2>
              <p className="text-gray-500 text-sm">Redirecting you to StayHub…</p>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          © {new Date().getFullYear()} StayHub · All rights reserved
        </p>
      </div>
    </div>
  );
};

export default Auth;
