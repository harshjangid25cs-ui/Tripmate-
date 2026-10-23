"use client";

import * as React from "react";

export interface WhatsAppCustomer {
  id: string;
  name: string | null;
  email: string | null;
  mobile: string;
}

interface WhatsAppLoginProps {
  onSuccess?: (customer: WhatsAppCustomer) => void;
  defaultName?: string;
  className?: string;
}

export function WhatsAppLogin({
  onSuccess,
  defaultName = "",
  className = "",
}: WhatsAppLoginProps) {
  const [step, setStep] = React.useState<"phone" | "otp">("phone");
  const [mobile, setMobile] = React.useState("");
  const [name, setName] = React.useState(defaultName);
  const [otpDigits, setOtpDigits] = React.useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [infoMsg, setInfoMsg] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState(0);
  const [devOtpHint, setDevOtpHint] = React.useState<string | null>(null);

  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // 30s countdown timer
  React.useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Clean raw digits to 10
  const cleanMobile = mobile.replace(/\D/g, "").slice(0, 10);
  const isFilled = cleanMobile.length === 10 && /^[6-9]/.test(cleanMobile) && name.trim().length > 0;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (cleanMobile.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!/^[6-9]/.test(cleanMobile)) {
      setErrorMsg("Indian mobile numbers must start with 6, 7, 8, or 9.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: cleanMobile,
          name: name.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to send WhatsApp verification code.");
      }

      setStep("otp");
      setCountdown(data.resendAfterSeconds || 30);
      setInfoMsg(`OTP sent to WhatsApp at +91 ${cleanMobile}`);

      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }

      // Auto-focus first digit input after transition
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    // Support paste of entire 6-digit code
    if (cleaned.length >= 6) {
      const pasted = cleaned.slice(0, 6).split("");
      setOtpDigits(pasted);
      inputRefs.current[5]?.focus();
      return;
    }

    // Single digit input
    const newDigits = [...otpDigits];
    newDigits[index] = cleaned[cleaned.length - 1] || "";
    setOtpDigits(newDigits);

    // Auto advance to next input
    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const otpCode = otpDigits.join("");
  const isOtpFilled = otpCode.length === 6;

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (otpCode.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit OTP code.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: cleanMobile,
          otp: otpCode,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Verification failed.");
      }

      setInfoMsg("Authentication successful! Redirecting...");

      if (onSuccess && data.customer) {
        onSuccess(data.customer);
        const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const rawTarget = params?.get("redirect");
        const target =
          rawTarget && rawTarget.startsWith("/") && !rawTarget.startsWith("//")
            ? rawTarget
            : "/home";
        // Full navigation ensures fresh session cookies are loaded
        window.location.assign(target);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Verification failed.");
      setIsLoading(false);
    }
  };

  const fillDevOtp = () => {
    if (devOtpHint && devOtpHint.length === 6) {
      setOtpDigits(devOtpHint.split(""));
    }
  };

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {/* Alert Banners */}
      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="w-full mb-3.5 p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2"
        >
          <span className="material-symbols-outlined text-base shrink-0 text-red-500">
            error
          </span>
          <span className="font-medium leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {infoMsg && (
        <div
          role="status"
          aria-live="polite"
          className="w-full mb-3.5 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-start gap-2 border border-emerald-200"
        >
          <span className="material-symbols-outlined text-base shrink-0 text-emerald-600">
            check_circle
          </span>
          <span className="font-medium leading-relaxed">{infoMsg}</span>
        </div>
      )}

      {/* Dev Mode OTP Quick-Fill helper */}
      {devOtpHint && step === "otp" && (
        <div className="w-full mb-3 p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-sm text-amber-600">
              key
            </span>
            <span>Test Code: <strong>{devOtpHint}</strong></span>
          </div>
          <button
            type="button"
            onClick={fillDevOtp}
            className="px-2 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold text-[11px] transition-colors"
          >
            Auto Fill
          </button>
        </div>
      )}

      {step === "phone" ? (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-3.5">
          {/* Phone Number Field */}
          <div className="flex flex-col gap-1.5 text-left">
            <label
              htmlFor="wa-mobile"
              className="font-label-md text-xs text-text-primary font-semibold"
            >
              WhatsApp Phone Number
            </label>
            <div className="relative flex items-center">
              {/* Country Code Pill */}
              <div className="absolute left-2.5 px-2 py-1 rounded-lg bg-surface-container text-text-primary font-bold text-xs flex items-center gap-1 border border-border-hairline select-none">
                <span className="text-sm">🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                id="wa-mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={cleanMobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="98765 43210"
                required
                maxLength={10}
                disabled={isLoading}
                className="w-full h-12 pl-24 pr-4 rounded-xl bg-surface-container-low text-text-primary placeholder:text-text-secondary font-body-md text-sm tracking-wider font-medium border border-transparent focus:border-[#25D366] focus:bg-surface-container-lowest focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[11px] text-text-secondary">
              A 6-digit real-time login code will be sent to your WhatsApp.
            </p>
          </div>

          {/* Optional Name for first-time profile creation */}
          <div className="flex flex-col gap-1.5 text-left">
            <label
              htmlFor="wa-name"
              className="font-label-md text-xs text-text-primary font-semibold"
            >
              Your Name <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-text-secondary pointer-events-none">
                person
              </span>
              <input
                id="wa-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arjun Kapoor"
                disabled={isLoading}
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-text-primary placeholder:text-text-secondary font-body-md text-sm border border-transparent focus:border-[#25D366] focus:bg-surface-container-lowest focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || cleanMobile.length !== 10}
            className={`w-full h-12 mt-1 rounded-xl text-white font-label-lg text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-[0.99] ${
              isFilled
                ? "bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa51] shadow-[0_0_24px_rgba(37,211,102,0.7),0_0_48px_rgba(37,211,102,0.35)] ring-2 ring-[#25D366] ring-offset-2 ring-offset-card-surface scale-[1.01]"
                : "bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa51] shadow-sm disabled:opacity-50"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Sending OTP...</span>
              </span>
            ) : (
              <>
                <div className="relative flex items-center justify-center">
                  {isFilled && (
                    <span className="absolute -inset-1 rounded-full bg-white opacity-40 animate-ping" />
                  )}
                  <svg className="w-4 h-4 fill-current relative z-10" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.825z" />
                  </svg>
                </div>
                <span>Get OTP on WhatsApp</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          {/* Header indicator */}
          <div className="flex items-center justify-between bg-surface-container-low p-2.5 rounded-xl border border-border-hairline">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <span className="font-label-md text-xs font-semibold text-text-primary">
                +91 {cleanMobile}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className="text-xs font-semibold text-primary-container hover:underline"
            >
              Change
            </button>
          </div>

          {/* 6 Digit Input Group */}
          <div className="flex flex-col gap-2">
            <label className="font-label-md text-xs text-text-primary font-semibold text-left">
              Enter 6-Digit Code
            </label>
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isLoading}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl bg-surface-container-low text-text-primary border border-border-hairline focus:border-[#25D366] focus:bg-surface-container-lowest focus:outline-none transition-all"
                />
              ))}
            </div>
          </div>

          {/* Verify Action Button */}
          <button
            type="submit"
            disabled={isLoading || otpCode.length !== 6}
            className={`w-full h-12 rounded-xl text-white font-label-lg text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-[0.99] ${
              isOtpFilled
                ? "bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa51] shadow-[0_0_24px_rgba(37,211,102,0.7),0_0_48px_rgba(37,211,102,0.35)] ring-2 ring-[#25D366] ring-offset-2 ring-offset-card-surface scale-[1.01]"
                : "bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa51] shadow-sm disabled:opacity-50"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Verifying...</span>
              </span>
            ) : (
              <>
                <span>Verify &amp; Continue</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </>
            )}
          </button>

          {/* Resend Action & Timer */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary pt-1">
            <span>Didn&apos;t receive code?</span>
            {countdown > 0 ? (
              <span className="font-semibold text-text-secondary">
                Resend in {countdown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={isLoading}
                className="font-bold text-[#25D366] hover:underline"
              >
                Resend OTP
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
