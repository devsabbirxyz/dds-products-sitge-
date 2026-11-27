import React, { useState, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { sendResetPassword } from "@/lib/firebase-auth";
import {
  requestTelegramBotOtpServer,
  verifyTelegramBotOtpServer,
  getTelegramBotInfoServer,
  pollTelegramDeepLinkOtpServer,
  requestEmailOtpServer,
  verifyEmailOtpServer,
  resetUserPasswordServer,
} from "@/lib/otp.functions";
import { OtpCard } from "@/components/otp/OtpCard";
import { InputField } from "./InputField";
import { PasswordField } from "./PasswordField";

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

/**
 * ForgotPasswordModal Component
 * Supports both:
 * 1. Telegram Bot OTP Reset: User enters @username/ID and clicks "Send OTP" -> receives 6-digit OTP in Telegram -> enters OTP & New Password.
 * 2. Email OTP Reset: User enters Email -> receives 6-digit OTP in Email -> enters OTP & New Password.
 */
export function ForgotPasswordModal({
  isOpen,
  onClose,
  defaultEmail = "",
}: ForgotPasswordModalProps) {
  const [method, setMethod] = useState<"telegram" | "email">("telegram");
  const [step, setStep] = useState<"request" | "verify" | "done">("request");

  // Email state
  const [email, setEmail] = useState(defaultEmail);

  // Telegram OTP state
  const [tgIdentifier, setTgIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [challengeIdentity, setChallengeIdentity] = useState("");
  const [botUsername, setBotUsername] = useState("dssotpbot");
  const [needsBotStart, setNeedsBotStart] = useState(false);
  const [sessionKey, setSessionKey] = useState("");
  const [autoListening, setAutoListening] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail);
      setStep("request");
      setOtpCode("");
      setNewPassword("");
      setError(null);
      setNeedsBotStart(false);
      setAutoListening(false);
      setSessionKey(`rst_${Math.random().toString(36).slice(2, 10)}`);

      getTelegramBotInfoServer()
        .then((info) => {
          if (info.botUsername) setBotUsername(info.botUsername);
        })
        .catch(() => {});
    }
  }, [isOpen, defaultEmail]);

  useEffect(() => {
    if (!isOpen || step !== "request" || !autoListening || !sessionKey) return;
    const interval = setInterval(async () => {
      try {
        const res = await pollTelegramDeepLinkOtpServer({
          data: {
            sessionKey,
            identifier: tgIdentifier.trim(),
            purpose: "reset",
          },
        });
        if (res.ok) {
          setAutoListening(false);
          setNeedsBotStart(false);
          setError(null);
          setChallengeToken(res.challengeToken);
          setChallengeIdentity(res.challengeIdentity);
          setOtpCode("");
          setStep("verify");
          setCooldown(45);
        }
      } catch {
        // ignore
      }
    }, 1800);
    return () => clearInterval(interval);
  }, [isOpen, step, autoListening, sessionKey, tgIdentifier]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function handleEmailSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      sendResetPassword(cleanEmail).catch(() => {});
      const res = await requestEmailOtpServer({
        data: {
          email: cleanEmail,
          purpose: "reset",
        },
      });
      if (!res.ok) {
        setError(res.error || "Unable to send reset code. Please try again.");
        return;
      }
      setChallengeToken(res.challengeToken);
      setChallengeIdentity(cleanEmail);
      setOtpCode("");
      setStep("verify");
      setCooldown(45);
    } catch (err: any) {
      setError(err.message || "Unable to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTelegramResetOtp(e?: FormEvent) {
    if (e) e.preventDefault();
    const clean = tgIdentifier.trim();
    if (!clean || clean.length < 2) {
      setError("আপনার টেলিগ্রাম @username অথবা Chat ID লিখুন");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNeedsBotStart(false);

      const res = await requestTelegramBotOtpServer({
        data: { identifier: clean, purpose: "reset" },
      });

      if (res.botUsername) setBotUsername(res.botUsername);

      if (!res.ok) {
        setNeedsBotStart(Boolean(res.needsBotStart));
        setAutoListening(true);
        setError(res.error);
        return;
      }

      setChallengeToken(res.challengeToken);
      setChallengeIdentity(res.challengeIdentity);
      setOtpCode("");
      setStep("verify");
      setCooldown(45);
    } catch (err: any) {
      setError(err?.message || "টেলিগ্রামে OTP পাঠাতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
        >
          {/* Dark Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Glass Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              background: "rgba(10, 22, 40, 0.88)",
              backdropFilter: "blur(24px) saturate(140%)",
              WebkitBackdropFilter: "blur(24px) saturate(140%)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              boxShadow:
                "inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 30px 80px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.15)",
            }}
            className="relative z-10 w-full max-w-[430px] rounded-[24px] p-6 sm:p-7 text-white"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {step === "done" ? (
              <div className="text-center py-2 space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#38bdf8]/15 border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3
                    id="forgot-modal-title"
                    className="font-display text-xl font-semibold tracking-tight text-white"
                  >
                    Password{" "}
                    <span className="bg-gradient-to-r from-[#7dd3fc] to-[#38bdf8] bg-clip-text text-transparent">
                      Updated
                    </span>
                  </h3>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    আপনার ৬ সংখ্যার OTP সফলভাবে ভেরিফাই হয়েছে এবং নতুন পাসওয়ার্ড সেট করা হয়েছে!
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="w-full h-11 rounded-[12px] bg-white/10 hover:bg-white/15 border border-white/15 text-[13px] font-semibold text-white transition-all cursor-pointer"
                >
                  Back to Sign In
                </motion.button>
              </div>
            ) : step === "verify" ? (
              /* STEP 2: VERIFY 6-DIGIT OTP + SET NEW PASSWORD */
              <div className="space-y-4">
                <PasswordField
                  label="New Password (Set before verifying code)"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  required
                />

                {error && (
                  <p className="text-[12px] text-rose-400 text-center font-medium">
                    {error}
                  </p>
                )}

                <div className="flex justify-center">
                  <OtpCard
                    length={6}
                    maskedIdentifier={
                      method === "email"
                        ? email || "s•••••@gmail.com"
                        : tgIdentifier || "s•••••@gmail.com"
                    }
                    demoMode={false}
                    fullScreen={false}
                    onChangeEmail={() => setStep("request")}
                    onVerify={async (enteredCode) => {
                      if (!newPassword || newPassword.length < 6) {
                        setError("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
                        return false;
                      }
                      if (method === "email") {
                        const res = await verifyEmailOtpServer({
                          data: {
                            email: email.trim().toLowerCase(),
                            code: enteredCode,
                            challengeToken,
                            purpose: "reset",
                          },
                        });
                        if (!res.ok) {
                          setError(res.error);
                          return false;
                        }
                        await resetUserPasswordServer({
                          data: {
                            emailOrIdentifier: email.trim().toLowerCase(),
                            newPassword,
                          },
                        }).catch(() => {});
                        return true;
                      } else {
                        const res = await verifyTelegramBotOtpServer({
                          data: {
                            challengeIdentity,
                            code: enteredCode,
                            challengeToken,
                            purpose: "reset",
                          },
                        });
                        if (!res.ok) {
                          setError(res.error);
                          return false;
                        }
                        await resetUserPasswordServer({
                          data: {
                            emailOrIdentifier: tgIdentifier.trim() || challengeIdentity,
                            newPassword,
                          },
                        }).catch(() => {});
                        return true;
                      }
                    }}
                    onResend={async () => {
                      if (method === "email") {
                        await handleEmailSubmit();
                      } else {
                        await handleSendTelegramResetOtp();
                      }
                    }}
                    onSuccess={() => {
                      setStep("done");
                    }}
                  />
                </div>
              </div>
            ) : (
              /* STEP 1: CHOOSE TELEGRAM OTP ("Send OTP") OR EMAIL */
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3
                    id="forgot-modal-title"
                    className="font-display text-[22px] font-semibold tracking-tight"
                  >
                    <span className="text-white">Reset </span>
                    <span className="bg-gradient-to-r from-[#7dd3fc] to-[#38bdf8] bg-clip-text text-transparent">
                      Password
                    </span>
                  </h3>
                  <p className="text-[12.5px] text-white/55">
                    টেলিগ্রাম বটে OTP পাঠিয়ে অথবা ইমেইলে পাসওয়ার্ড রিসেট করুন
                  </p>
                </div>

                {/* Method Switcher: Telegram OTP vs Email */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.05] border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setMethod("telegram");
                      setError(null);
                    }}
                    className={`h-9 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      method === "telegram"
                        ? "bg-[#229ED9] text-white shadow"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram OTP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMethod("email");
                      setError(null);
                    }}
                    className={`h-9 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      method === "email"
                        ? "bg-[#0ea5e9] text-white shadow"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email OTP</span>
                  </button>
                </div>

                {method === "telegram" ? (
                  <form onSubmit={handleSendTelegramResetOtp} className="space-y-4" noValidate>
                    <InputField
                      label="Telegram Username or Chat ID"
                      type="text"
                      value={tgIdentifier}
                      onChange={(e) => {
                        setTgIdentifier(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="@yourusername অথবা 123456789"
                      autoFocus
                      icon={<Send className="w-4 h-4" />}
                      error={error}
                    />

                    {(needsBotStart || autoListening) && botUsername && (
                      <div className="rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/40 p-3 space-y-2 text-center">
                        <p className="text-[11.5px] text-white/90 leading-relaxed">
                          বটটি আগে Start করা না থাকলে নিচে ক্লিক করে <strong>Start</strong> চাপুন, সাথে সাথে রিসেট OTP চলে যাবে:
                        </p>
                        <a
                          href={`https://t.me/${botUsername}?start=${sessionKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setAutoListening(true)}
                          className="w-full h-9 rounded-xl bg-[#229ED9] hover:bg-[#1e8ec4] text-white font-semibold text-xs inline-flex items-center justify-center gap-2 shadow transition-all"
                        >
                          <span>@{botUsername} বট Start করুন</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-1/2 h-11 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.11] border border-white/15 text-[13px] font-medium text-white/80 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <motion.button
                        type="submit"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        style={{
                          background:
                            "linear-gradient(90deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)",
                          boxShadow: "0 8px 25px rgba(14, 165, 233, 0.4)",
                        }}
                        className="w-1/2 h-11 rounded-[12px] text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>Send OTP</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
                    <InputField
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="name@domain.com"
                      autoComplete="email"
                      autoFocus
                      icon={<Mail className="w-4 h-4" />}
                      error={error}
                    />

                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-1/2 h-11 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.11] border border-white/15 text-[13px] font-medium text-white/80 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <motion.button
                        type="submit"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        style={{
                          background:
                            "linear-gradient(90deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)",
                          boxShadow: "0 8px 25px rgba(14, 165, 233, 0.4)",
                        }}
                        className="w-1/2 h-11 rounded-[12px] text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>Send OTP</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

