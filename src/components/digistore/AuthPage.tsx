import React, { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  User,
  Phone,
  ArrowRight,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { DIGISTORE_CONFIG, type CountryCode } from "@/config/auth-config";
import { AuthBackground } from "./AuthBackground";
import { GlassCard } from "./GlassCard";
import { InputField } from "./InputField";
import { PasswordField } from "./PasswordField";
import {
  PasswordStrength,
  calculatePasswordStrength,
} from "./PasswordStrength";
import { SocialButtons } from "./SocialButtons";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { OtpCard } from "@/components/otp/OtpCard";
import {
  signInWithEmail,
  signUpWithEmail,
  isEmailAlreadyRegistered,
  saveLocalUser,
  type DigiStoreUser,
} from "@/lib/firebase-auth";
import {
  requestEmailOtpServer,
  verifyEmailOtpServer,
  registerEmailAccountServer,
  verifyEmailPasswordLoginServer,
} from "@/lib/otp.functions";
import { notifyNewSignupServer } from "@/lib/telegram.functions";
import { attachReferrer } from "@/lib/referral.functions";
import {
  getPendingReferralCode,
  clearPendingReferralCode,
} from "@/components/storefront/ReferralCapture";
import { supabase } from "@/integrations/supabase/client";

export interface AuthPageProps {
  mode: "login" | "signup";
  redirectUrl?: string;
}

const staggerContainer = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 1, y: 0 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

const glassToastStyle: React.CSSProperties = {
  background: "rgba(13, 19, 32, 0.88)",
  backdropFilter: "blur(20px) saturate(140%)",
  WebkitBackdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid rgba(16, 185, 129, 0.38)",
  color: "#ffffff",
  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(16, 185, 129, 0.18)",
  borderRadius: "14px",
};

/**
 * AuthPage Component
 * - Single centered GlassCard (max-w-[460px] on login, max-w-[560px] on signup)
 * - No left branding panel, no split-screen, no marketing blocks
 * - Smooth AnimatePresence blur-morph transition between Login and Signup without unmounting GlassCard
 */
export function AuthPage({ mode, redirectUrl = "/dashboard" }: AuthPageProps) {
  const navigate = useNavigate();

  // Shared / Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  // Signup specific state
  const [signupStep, setSignupStep] = useState<"form" | "otp">("form");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<CountryCode>(
    DIGISTORE_CONFIG.countryCodes.find(
      (c) => c.dialCode === DIGISTORE_CONFIG.defaultCountryCode
    ) || DIGISTORE_CONFIG.countryCodes[0]
  );
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Custom Server 6-Digit Email OTP state
  const [otpCode, setOtpCode] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [sandboxCode, setSandboxCode] = useState<string | undefined>(undefined);
  const [deliveredVia, setDeliveredVia] = useState<string>("sandbox");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Loading & Validation Errors
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(
    null
  );
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);

  // Reset inline errors when switching between /login and /signup
  useEffect(() => {
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setPhoneError(null);
    setTermsError(null);
    setSignupStep("form");
  }, [mode]);

  // Load remembered email
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("digistore_remembered_email");
      if (saved && !email) {
        setEmail(saved);
      }
    }
  }, []);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function finishRedirect() {
    if (redirectUrl && redirectUrl !== "/dashboard") {
      window.location.href = redirectUrl;
    } else {
      navigate({ to: "/dashboard" });
    }
  }

  // =========================================================================
  // LOGIN SUBMIT HANDLER
  // =========================================================================
  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);

    let hasErr = false;
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setEmailError("Email address is required");
      hasErr = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError("Enter a valid email (e.g. name@domain.com)");
      hasErr = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasErr = true;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      hasErr = true;
    }

    if (hasErr) return;

    try {
      setLoading(true);
      if (rememberMe) {
        localStorage.setItem("digistore_remembered_email", cleanEmail);
      } else {
        localStorage.removeItem("digistore_remembered_email");
      }

      // 1. Check Supabase Auth if user exists there
      let supabaseAuthSuccess = false;
      try {
        const { data: sbLogin } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (sbLogin?.user) {
          supabaseAuthSuccess = true;
        }
      } catch {
        // Ignore if user is managed by custom server account store
      }

      // 2. Verify against server-side registered user accounts + password hash
      const serverCheck = await verifyEmailPasswordLoginServer({
        data: {
          email: cleanEmail,
          password,
        },
      });

      if (!serverCheck.ok) {
        if (serverCheck.code === "WRONG_PASSWORD" || !supabaseAuthSuccess) {
          const errMsg = serverCheck.error || "Invalid email or password.";
          if (serverCheck.code === "USER_NOT_FOUND") {
            setEmailError(errMsg);
          } else {
            setPasswordError(errMsg);
          }
          toast.error(errMsg, { style: glassToastStyle });
          return;
        }
      }

      if (serverCheck.ok && serverCheck.user) {
        const verifiedUser: DigiStoreUser = {
          id: serverCheck.user.id,
          email: serverCheck.user.email,
          displayName: serverCheck.user.displayName,
          phoneNumber: serverCheck.user.phoneNumber,
          photoURL: serverCheck.user.photoURL,
          provider: serverCheck.user.provider,
          emailVerified: true,
          createdAt: new Date().toISOString(),
        };
        saveLocalUser(verifiedUser);
        toast.success(`Welcome back, ${verifiedUser.displayName}!`, {
          style: glassToastStyle,
        });
        finishRedirect();
        return;
      }

      const { user } = await signInWithEmail(cleanEmail, password);
      toast.success(`Welcome back, ${user.displayName}!`, {
        style: glassToastStyle,
      });
      finishRedirect();
    } catch (err: any) {
      const msg = err?.message || "Invalid email or password.";
      setPasswordError(msg);
      toast.error(msg, { style: glassToastStyle });
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // SIGNUP STEP 1: VALIDATE & SEND OTP OR CREATE ACCOUNT
  // =========================================================================
  async function handleSignupSubmit(e: FormEvent) {
    e.preventDefault();
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setPhoneError(null);
    setTermsError(null);

    let hasErr = false;
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      setNameError("Please enter your full name");
      hasErr = true;
    }

    if (!cleanEmail) {
      setEmailError("Email address is required");
      hasErr = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError("Enter a valid email (e.g. name@domain.com)");
      hasErr = true;
    }

    const strength = calculatePasswordStrength(password);
    if (!password) {
      setPasswordError("Password is required");
      hasErr = true;
    } else if (password.length < 8) {
      setPasswordError("At least 8 characters required");
      hasErr = true;
    } else if (strength.score < 2) {
      setPasswordError("Use uppercase, numbers, or symbols");
      hasErr = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Confirm your password");
      hasErr = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      hasErr = true;
    }

    if (phone.trim() && !/^[0-9\s-]{6,15}$/.test(phone.trim())) {
      setPhoneError("Enter a valid phone number");
      hasErr = true;
    }

    if (!agreeTerms) {
      setTermsError("Please agree to the Terms & Privacy Policy");
      hasErr = true;
    }

    if (hasErr) return;

    try {
      setLoading(true);

      // 1. Check client + database registry first so duplicate email is caught immediately
      if (await isEmailAlreadyRegistered(cleanEmail)) {
        const dupMsg =
          "এই জিমেইল/ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট খোলা আছে! নতুন অ্যাকাউন্ট না খুলে অনুগ্রহ করে লগইন করুন।";
        setEmailError(dupMsg);
        toast.error(dupMsg, { style: glassToastStyle });
        return;
      }

      const otpRes = await requestEmailOtpServer({
        data: {
          email: cleanEmail,
          fullName: cleanName,
          purpose: "signup",
        },
      });

      if (!otpRes.ok) {
        const errMsg =
          otpRes.error ||
          "এই জিমেইল/ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট খোলা আছে! অনুগ্রহ করে লগইন করুন।";
        setEmailError(errMsg);
        toast.error(errMsg, { style: glassToastStyle });
        return;
      }

      setChallengeToken(otpRes.challengeToken);
      setSandboxCode(otpRes.sandboxCode);
      setDeliveredVia(otpRes.deliveredVia);
      setOtpCode("");
      setSignupStep("otp");
      setResendCooldown(45);

      toast.success(`Verification code sent to ${cleanEmail}`, {
        style: glassToastStyle,
      });
    } catch (err: any) {
      const msg =
        err?.message ||
        "ভেরিফিকেশন কোড পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
      setEmailError(msg);
      toast.error(msg, { style: glassToastStyle });
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // SIGNUP STEP 2: VERIFY 6-DIGIT OTP & COMPLETE ACCOUNT (via OtpCard V15)
  // =========================================================================
  async function handleVerifySignupOtpCode(enteredCode: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const formattedPhone = phone.trim()
      ? `${country.dialCode} ${phone.trim()}`
      : undefined;

    if (!challengeToken) {
      return false;
    }

    const verified = await verifyEmailOtpServer({
      data: {
        email: cleanEmail,
        code: enteredCode,
        purpose: "signup",
        challengeToken,
      },
    });

    if (!verified.ok) {
      return false;
    }

    // Sync with Supabase if configured
    try {
      const { data: signUpData, error: sbSignUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: formattedPhone,
            email_otp_verified: true,
          },
        },
      });

      const isAlreadyRegisteredInSupabase =
        (sbSignUpError &&
          /already registered|already exists/i.test(sbSignUpError.message)) ||
        (signUpData?.user &&
          Array.isArray(signUpData.user.identities) &&
          signUpData.user.identities.length === 0);

      if (isAlreadyRegisteredInSupabase) {
        const dupMsg =
          "এই জিমেইল/ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট খোলা আছে! অনুগ্রহ করে লগইন করুন।";
        setEmailError(dupMsg);
        toast.error(dupMsg, { style: glassToastStyle });
        setSignupStep("form");
        return false;
      }

      const newUserId = signUpData?.user?.id;
      if (newUserId) {
        notifyNewSignupServer({
          data: { email: cleanEmail, fullName: fullName.trim() },
        }).catch(() => {});
        const pendingCode = getPendingReferralCode();
        if (pendingCode) {
          attachReferrer({ data: { newUserId, code: pendingCode } })
            .then(() => clearPendingReferralCode())
            .catch(() => {});
        }
      }
    } catch {
      // Proceed with Firebase/DigiStore user session
    }

    await signUpWithEmail(
      fullName.trim(),
      cleanEmail,
      password,
      formattedPhone
    );

    await registerEmailAccountServer({
      data: {
        email: cleanEmail,
        fullName: fullName.trim(),
        phone: formattedPhone,
        password,
        provider: "email",
      },
    }).catch(() => {});

    return true;
  }

  async function handleResendOtp(): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await requestEmailOtpServer({
      data: {
        email: cleanEmail,
        fullName: fullName.trim(),
        purpose: "signup",
      },
    });
    setChallengeToken(res.challengeToken);
    setSandboxCode(res.sandboxCode);
    setDeliveredVia(res.deliveredVia);
  }

  function handleSocialSuccess(user: DigiStoreUser, providerName: string) {
    toast.success(`Signed in with ${providerName} as ${user.displayName}`, {
      style: glassToastStyle,
    });
    finishRedirect();
  }

  function handleSocialError(errorMessage: string) {
    toast.error(errorMessage, { style: glassToastStyle });
  }

  const cardMaxWidth =
    mode === "login"
      ? "max-w-[460px]"
      : signupStep === "otp"
        ? "max-w-[520px]"
        : "max-w-[560px]";

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center px-4 py-8 overflow-x-hidden font-sans selection:bg-[#38bdf8]/30 selection:text-white">
      {/* 1. Dark Cinematic 3D Chrome/Cyan Background */}
      <AuthBackground />

      {/* Top Spacer for Vertical Centering */}
      <div className="h-2 shrink-0" aria-hidden="true" />

      {/* 2. Single Centered Signature Chamfered Glass Card (NEVER Unmounts on Route Swap) */}
      <main className="relative z-10 w-full flex items-center justify-center my-auto">
        <GlassCard
          maxWidthClass={cardMaxWidth}
          transitionTrigger={
            mode === "login"
              ? "login"
              : signupStep === "otp"
                ? "signup-otp"
                : "signup-form"
          }
        >
          <AnimatePresence mode="wait" initial={false}>
            {mode === "login" ? (
              /* ============================================================== */
              /* LOGIN FORM VIEW                                                */
              /* ============================================================== */
              <motion.div
                key="login-view"
                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="transform-gpu"
              >
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-5"
                >
                  {/* Two-Tone Heading & Subtext */}
                  <motion.div variants={staggerItem} className="space-y-1.5">
                    <h1 className="font-display text-[32px] leading-tight font-semibold tracking-tight">
                      <span className="text-white">Welcome </span>
                      <span className="bg-gradient-to-r from-[#34d399] via-[#10b981] to-[#22d3ee] bg-clip-text text-transparent">
                        Back
                      </span>
                    </h1>
                    <p className="text-[13px] text-white/55">
                      Enter your credentials to access your secure account
                    </p>
                  </motion.div>

                  {/* Form */}
                  <form
                    onSubmit={handleLoginSubmit}
                    className="space-y-4"
                    noValidate
                  >
                    {/* 1. Email Address */}
                    <motion.div variants={staggerItem}>
                      <InputField
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError(null);
                        }}
                        placeholder="name@domain.com"
                        autoComplete="email"
                        autoFocus
                        required
                        icon={<Mail className="w-4 h-4" />}
                        error={emailError}
                      />
                    </motion.div>

                    {/* 2. Password */}
                    <motion.div variants={staggerItem}>
                      <PasswordField
                        label="Password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        placeholder="••••••••••••"
                        autoComplete="current-password"
                        required
                        error={passwordError}
                      />
                    </motion.div>

                    {/* 3. Row: Custom Emerald-Cyan Checkbox "Remember me" + "Forgot password?" */}
                    <motion.div
                      variants={staggerItem}
                      className="flex items-center justify-between pt-0.5"
                    >
                      <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="sr-only"
                        />
                        <span
                          className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-all duration-200 ${
                            rememberMe
                              ? "bg-[#10b981] border border-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.45)]"
                              : "bg-white/[0.06] border border-white/20 group-hover:border-white/40"
                          }`}
                        >
                          {rememberMe && (
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          )}
                        </span>
                        <span className="text-[13px] text-white/75 group-hover:text-white transition-colors">
                          Remember me
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setIsForgotOpen(true)}
                        className="text-[13px] text-white/60 hover:text-[#34d399] transition-colors focus:outline-none focus-visible:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </motion.div>

                    {/* 4. Primary Button: "Sign In" + ArrowRight */}
                    <motion.div variants={staggerItem} className="pt-1">
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background:
                            "linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)",
                          boxShadow: "0 8px 30px rgba(16, 185, 129, 0.42)",
                        }}
                        className="group w-full h-12 rounded-[12px] text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399] cursor-pointer"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <>
                            <span>Sign In</span>
                            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  </form>

                  {/* 5. Thin Divider: "or continue with" */}
                  <motion.div
                    variants={staggerItem}
                    className="flex items-center gap-3 py-0.5"
                  >
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[11px] uppercase tracking-wider text-white/35">
                      or continue with
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </motion.div>

                  {/* 6. Two Social Buttons Side-by-Side (Google | Telegram) */}
                  <motion.div variants={staggerItem}>
                    <SocialButtons
                      disabled={loading}
                      redirectUrl={redirectUrl}
                      onSuccess={handleSocialSuccess}
                      onError={handleSocialError}
                    />
                  </motion.div>

                  {/* 7. Footer Line Centered */}
                  <motion.p
                    variants={staggerItem}
                    className="text-center text-[13px] text-white/55 pt-1"
                  >
                    Don&apos;t have an account?{" "}
                    <Link
                      to="/signup"
                      className="font-bold text-[#34d399] hover:text-[#6ee7b7] transition-colors"
                    >
                      Sign up
                    </Link>
                  </motion.p>
                </motion.div>
              </motion.div>
            ) : signupStep === "otp" ? (
              /* ============================================================== */
              /* SIGNUP STEP 2: 6-DIGIT ANIMATED OTP VERIFICATION INSIDE CARD   */
              /* ============================================================== */
              <motion.div
                key="signup-otp-view"
                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="transform-gpu"
              >
                <OtpCard
                  length={6}
                  maskedIdentifier={email || "taxonaj676@digeros.com"}
                  demoMode={false}
                  buttonLabel="Verify & Create Account"
                  fullScreen={false}
                  onChangeEmail={() => setSignupStep("form")}
                  onVerify={handleVerifySignupOtpCode}
                  onResend={handleResendOtp}
                  onSuccess={finishRedirect}
                />
              </motion.div>
            ) : (
              /* ============================================================== */
              /* SIGNUP FORM VIEW (STEP 1)                                      */
              /* ============================================================== */
              <motion.div
                key="signup-view"
                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="transform-gpu"
              >
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-4"
                >
                  {/* Two-Tone Heading & Subtext */}
                  <motion.div variants={staggerItem} className="space-y-1">
                    <h1 className="font-display text-[32px] leading-tight font-semibold tracking-tight">
                      <span className="text-white">Create </span>
                      <span className="bg-gradient-to-r from-[#34d399] via-[#10b981] to-[#22d3ee] bg-clip-text text-transparent">
                        Account
                      </span>
                    </h1>
                    <p className="text-[13px] text-white/55">
                      Join us today to access your secure workspace
                    </p>
                  </motion.div>

                  <form
                    onSubmit={handleSignupSubmit}
                    className="space-y-3.5"
                    noValidate
                  >
                    {/* 1. Full Name */}
                    <motion.div variants={staggerItem}>
                      <InputField
                        label="Full Name"
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (nameError) setNameError(null);
                        }}
                        placeholder="Alex Morgan"
                        autoComplete="name"
                        autoFocus
                        required
                        icon={<User className="w-4 h-4" />}
                        error={nameError}
                      />
                    </motion.div>

                    {/* 2. Email Address */}
                    <motion.div variants={staggerItem}>
                      <InputField
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError(null);
                        }}
                        placeholder="name@domain.com"
                        autoComplete="email"
                        required
                        icon={<Mail className="w-4 h-4" />}
                        error={emailError}
                      />
                    </motion.div>

                    {/* 3. Two Columns Side-by-Side on Desktop: Password | Confirm Password */}
                    <motion.div
                      variants={staggerItem}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      <PasswordField
                        label="Password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                        required
                        error={passwordError}
                      />

                      <PasswordField
                        label="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (confirmPasswordError)
                            setConfirmPasswordError(null);
                        }}
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                        required
                        error={confirmPasswordError}
                      />
                    </motion.div>

                    {/* 5. Thin Live Password-Strength Bar under Password */}
                    <PasswordStrength password={password} />

                    {/* 4. Optional Phone Number with Country Code Selector (Default +880) */}
                    <motion.div variants={staggerItem}>
                      <InputField
                        label="Phone Number"
                        hint="Optional"
                        isPhone
                        selectedCountry={country}
                        onCountryChange={setCountry}
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (phoneError) setPhoneError(null);
                        }}
                        placeholder="1712-345678"
                        autoComplete="tel"
                        icon={<Phone className="w-3.5 h-3.5" />}
                        error={phoneError}
                      />
                    </motion.div>

                    {/* 6. Checkbox: "I agree to the Terms & Privacy Policy" */}
                    <motion.div
                      variants={staggerItem}
                      className={`pt-0.5 ${termsError ? "animate-shake" : ""}`}
                    >
                      <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(e) => {
                            setAgreeTerms(e.target.checked);
                            if (termsError) setTermsError(null);
                          }}
                          className="sr-only"
                        />
                        <span
                          className={`w-4 h-4 rounded-[5px] shrink-0 flex items-center justify-center transition-all duration-200 ${
                            agreeTerms
                              ? "bg-[#10b981] border border-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.45)]"
                              : "bg-white/[0.06] border border-white/20 group-hover:border-white/40"
                          }`}
                        >
                          {agreeTerms && (
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          )}
                        </span>
                        <span className="text-[13px] text-white/75">
                          I agree to the{" "}
                          <Link
                            to="/terms"
                            className="text-[#34d399] hover:underline font-medium"
                          >
                            Terms
                          </Link>{" "}
                          &amp;{" "}
                          <Link
                            to="/privacy"
                            className="text-[#34d399] hover:underline font-medium"
                          >
                            Privacy Policy
                          </Link>
                        </span>
                      </label>
                      {termsError && (
                        <p className="text-[11px] text-rose-400 mt-1 font-medium">
                          {termsError}
                        </p>
                      )}
                    </motion.div>

                    {/* 7. Primary Button: "Create Account" + ArrowRight */}
                    <motion.div variants={staggerItem} className="pt-1">
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background:
                            "linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)",
                          boxShadow: "0 8px 30px rgba(16, 185, 129, 0.42)",
                        }}
                        className="group w-full h-12 rounded-[12px] text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399] cursor-pointer"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <>
                            <span>Create Account</span>
                            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  </form>

                  {/* 8. Divider "or sign up with" + Two Side-by-Side Buttons: Google | Telegram */}
                  <motion.div
                    variants={staggerItem}
                    className="flex items-center gap-3 py-0.5"
                  >
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[11px] uppercase tracking-wider text-white/35">
                      or sign up with
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </motion.div>

                  <motion.div variants={staggerItem}>
                    <SocialButtons
                      disabled={loading}
                      redirectUrl={redirectUrl}
                      onSuccess={handleSocialSuccess}
                      onError={handleSocialError}
                    />
                  </motion.div>

                  {/* 9. Footer: "Already have an account? Sign in" */}
                  <motion.p
                    variants={staggerItem}
                    className="text-center text-[13px] text-white/55 pt-0.5"
                  >
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-bold text-[#34d399] hover:text-[#6ee7b7] transition-colors"
                    >
                      Sign in
                    </Link>
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </main>

      {/* 3. Minimal Centered Footer at the Very Bottom ("© 2026 DigiStore", 40% opacity) */}
      <footer className="relative z-10 pt-6 text-center text-[11px] text-white/40 select-none">
        © 2026 {DIGISTORE_CONFIG.siteName}
      </footer>

      {/* Forgot Password Glass Modal */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        defaultEmail={email}
      />
    </div>
  );
}
