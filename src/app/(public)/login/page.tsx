"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WhatsAppLogin } from "@/components/features/auth/WhatsAppLogin";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authMethod, setAuthMethod] = React.useState<"whatsapp" | "email">(
    searchParams.get("method") === "whatsapp" ? "whatsapp" : "email"
  );
  const [authMode, setAuthMode] = React.useState<"login" | "signup">("login");

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [infoMsg, setInfoMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    const method = searchParams.get("method");
    if (method === "whatsapp") {
      setAuthMethod("whatsapp");
    } else if (method === "email") {
      setAuthMethod("email");
    }
    const error = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    if (errorDesc) {
      setErrorMsg(errorDesc);
    } else if (error === "auth_exchange_failed") {
      setErrorMsg("Authentication failed. Please try again.");
    } else if (error) {
      setErrorMsg(`Authentication error: ${error}`);
    }
  }, [searchParams]);

  const supabase = React.useMemo(() => createClient(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (authMode === "signup" && !fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    setIsLoading(true);

    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          setIsLoading(false);
          return;
        }

        // Full navigation clears client route cache and ensures fresh session cookies are sent
        window.location.assign("/home");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          setErrorMsg(error.message);
          setIsLoading(false);
          return;
        }

        // If email confirmation is disabled, session is returned immediately
        if (data.session) {
          window.location.assign("/home");
        } else {
          setInfoMsg(
            "Account created! Please check your email inbox to verify your account, or sign in."
          );
          setIsLoading(false);
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("not enabled") ||
          error.message.toLowerCase().includes("unsupported provider")
        ) {
          setErrorMsg(
            "Google Sign-In is not enabled on your Supabase project yet. Please enable the Google provider in your Supabase Dashboard (Authentication > Providers > Google)."
          );
        } else {
          setErrorMsg(error.message);
        }
        setIsLoading(false);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not initialize Google sign-in."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-text-primary flex flex-col antialiased selection:bg-primary-container selection:text-white">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-40 bg-surface/80 backdrop-blur-xl border-b border-border-hairline">
        <div className="h-16 px-4 max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Go Back"
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">
                arrow_back
              </span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-sm">
                M
              </div>
              <h1 className="font-headline-sm text-base text-text-primary font-bold tracking-tight">
                {authMethod === "whatsapp"
                  ? "WhatsApp Login"
                  : authMode === "login"
                  ? "Login"
                  : "Sign Up"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-text-secondary">
              <span className="material-symbols-outlined text-[18px]">
                lock
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-20 pb-8 px-4 flex flex-col justify-center items-center">
        <div className="flex flex-col w-full max-w-md mx-auto">
          {/* Method Switcher: WhatsApp OTP vs Email */}
          <div className="flex items-center justify-center p-1 bg-surface-container rounded-xl mb-4 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("whatsapp");
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`flex-1 py-2 text-center font-label-md text-xs rounded-lg transition-all duration-200 font-semibold flex items-center justify-center gap-1.5 ${
                authMethod === "whatsapp"
                  ? "bg-card-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-[#25D366]" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.825z" />
              </svg>
              <span>WhatsApp OTP</span>
              <span className="ml-1 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                FAST
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("email");
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`flex-1 py-2 text-center font-label-md text-xs rounded-lg transition-all duration-200 font-semibold flex items-center justify-center gap-1.5 ${
                authMethod === "email"
                  ? "bg-card-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                mail
              </span>
              <span>Email &amp; Password</span>
            </button>
          </div>

          {/* If in Email mode: Segmented Mode Switcher (Log In / Sign Up) */}
          {authMethod === "email" && (
            <div className="flex items-center justify-center p-1 bg-surface-container rounded-xl mb-4 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`flex-1 py-1.5 text-center font-label-md text-xs rounded-lg transition-all duration-200 font-semibold ${
                  authMode === "login"
                    ? "bg-card-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`flex-1 py-1.5 text-center font-label-md text-xs rounded-lg transition-all duration-200 font-semibold ${
                  authMode === "signup"
                    ? "bg-card-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Main Card Surface */}
          <div className="bg-card-surface border border-border-hairline rounded-2xl p-6 md:p-7 shadow-sm flex flex-col items-center">
            {/* Tripmate Brand Emblem */}
            <div className="mb-4 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center shadow-sm">
                <span className="text-2xl text-on-primary select-none font-extrabold tracking-tighter">
                  M
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="font-headline-sm text-base text-text-primary tracking-tight font-extrabold">
                  Tripmate
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-badge text-[10px] font-bold">
                  TRIP OS
                </span>
              </div>
            </div>

            {/* Header Copy */}
            <div className="text-center mb-6">
              <h2 className="font-headline-md text-xl text-text-primary font-bold tracking-tight">
                {authMethod === "whatsapp"
                  ? "Instant WhatsApp Login"
                  : authMode === "login"
                  ? "Welcome to Tripmate"
                  : "Create Tripmate Account"}
              </h2>
              <p className="font-body-md text-xs text-text-secondary mt-1">
                {authMethod === "whatsapp"
                  ? "Log in seamlessly with your WhatsApp phone number"
                  : authMode === "login"
                  ? "Plan hotels, rides & rest stops in one go"
                  : "Unlock group trip sync & shared road books"}
              </p>
            </div>

            {/* Error / Info alerts for email flow */}
            {authMethod === "email" && errorMsg && (
              <div
                role="alert"
                aria-live="assertive"
                className="w-full mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2"
              >
                <span className="material-symbols-outlined text-base shrink-0">
                  error
                </span>
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {authMethod === "email" && infoMsg && (
              <div
                role="status"
                aria-live="polite"
                className="w-full mb-4 p-3 rounded-xl bg-surface-container text-text-primary text-xs flex items-start gap-2"
              >
                <span className="material-symbols-outlined text-base shrink-0 text-success-green">
                  check_circle
                </span>
                <span className="font-medium leading-relaxed">{infoMsg}</span>
              </div>
            )}

            {/* Form Selection */}
            {authMethod === "whatsapp" ? (
              <WhatsAppLogin
                onSuccess={() => {
                  const rawRedirect = searchParams.get("redirect");
                  const redirectTarget =
                    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
                      ? rawRedirect
                      : "/home";
                  window.location.assign(redirectTarget);
                }}
              />
            ) : (
              <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                {/* Dynamic Full Name field for Sign Up */}
                {authMode === "signup" && (
                  <div className="flex flex-col gap-1.5 text-left">
                    <label
                      htmlFor="full-name"
                      className="font-label-md text-xs text-text-primary font-semibold"
                    >
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-text-secondary pointer-events-none">
                        badge
                      </span>
                      <input
                        id="full-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Arjun Kapoor"
                        required
                        disabled={isLoading}
                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-text-primary placeholder:text-text-secondary font-body-md text-sm border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label
                    htmlFor="email"
                    className="font-label-md text-xs text-text-primary font-semibold"
                  >
                    Email address
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-text-secondary pointer-events-none">
                      alternate_email
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      disabled={isLoading}
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-text-primary placeholder:text-text-secondary font-body-md text-sm border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label
                    htmlFor="password"
                    className="font-label-md text-xs text-text-primary font-semibold"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-text-secondary pointer-events-none">
                      lock
                    </span>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        authMode === "signup"
                          ? "Create a password (min 6 characters)"
                          : "••••••••"
                      }
                      required
                      minLength={6}
                      disabled={isLoading}
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-text-primary placeholder:text-text-secondary font-body-md text-sm border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-1 rounded-xl bg-primary-container hover:bg-primary active:bg-surface-tint text-on-primary font-label-lg text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  <span>
                    {isLoading
                      ? "Processing..."
                      : authMode === "login"
                      ? "Continue"
                      : "Join Tripmate"}
                  </span>
                  {!isLoading && (
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="w-full flex items-center my-5">
              <div className="flex-1 h-px bg-border-hairline" />
              <span className="px-3 font-body-sm text-[11px] text-text-secondary uppercase tracking-wider">
                or connect with
              </span>
              <div className="flex-1 h-px bg-border-hairline" />
            </div>

            {/* Social Authentication: Google */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full h-11 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-text-primary flex items-center justify-between border border-border-hairline/50 transition-colors disabled:opacity-50 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="font-label-md text-xs font-semibold text-text-primary">
                    Continue with Google
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-text-secondary">
                  chevron_right
                </span>
              </button>
            </div>

            {/* Mode Toggle / Switch helper */}
            <div className="mt-5 text-center">
              {authMethod === "whatsapp" ? (
                <p className="font-body-md text-xs text-text-secondary">
                  Prefer email and password?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("email");
                      setErrorMsg(null);
                      setInfoMsg(null);
                    }}
                    className="font-label-lg text-xs text-primary-container font-bold hover:underline ml-1"
                  >
                    Switch to Email
                  </button>
                </p>
              ) : (
                <p className="font-body-md text-xs text-text-secondary">
                  {authMode === "login" ? "New here?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === "login" ? "signup" : "login");
                      setErrorMsg(null);
                      setInfoMsg(null);
                    }}
                    className="font-label-lg text-xs text-primary-container font-bold hover:underline ml-1"
                  >
                    {authMode === "login" ? "Sign up" : "Log in"}
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Trust & Security Micro-banner */}
          <div className="mt-4 p-3 rounded-xl bg-surface-container flex items-center justify-center gap-2 border border-border-hairline">
            <span className="material-symbols-outlined text-[18px] text-success-green select-none">
              verified_user
            </span>
            <span className="font-body-sm text-xs text-text-secondary font-medium">
              100% verified &amp; secure booking
            </span>
          </div>

          {/* KYC Legal Footer Links */}
          <footer className="mt-5 text-center text-[11px] text-text-secondary space-x-2">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:underline">Refund Policy</Link>
            <span>•</span>
            <Link href="/contact" className="hover:underline">Contact</Link>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary-container border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
