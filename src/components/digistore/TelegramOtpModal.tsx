import React, { useState, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Mail,
  Phone,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";
import {
  requestTelegramBotOtpServer,
  verifyTelegramBotOtpServer,
  getTelegramBotInfoServer,
  pollTelegramDeepLinkOtpServer,
  saveTelegramUserProfileServer,
} from "@/lib/otp.functions";
import { handleTelegramAuth, type DigiStoreUser } from "@/lib/firebase-auth";
import { OtpCard } from "@/components/otp/OtpCard";
import { InputField } from "./InputField";

export interface TelegramOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: DigiStoreUser) => void;
}

interface TgResolvedProfile {
  chatId: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl?: string;
  savedEmail?: string;
  savedPhone?: string;
  supabaseUserId?: string;
}

/**
 * TelegramOtpModal Component
 * 1. Direct Bot /start or @username -> sends 6-digit OTP via @ddsotpbot and fetches user's real Telegram profile picture.
 * 2. Verifies 6-digit OTP.
 * 3. If user's Gmail & Phone Number are already saved on their Telegram profile, logs them in immediately with their Gmail, Phone & Telegram Avatar.
 *    Otherwise shows Step 3 ("Complete Your Account") asking for their Gmail & Phone Number and saves it permanently.
 */
export function TelegramOtpModal({
  isOpen,
  onClose,
  onSuccess,
}: TelegramOtpModalProps) {
  const [step, setStep] = useState<"input" | "otp" | "complete_profile">("input");
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string>("dssotpbot");
  const [botNumericId, setBotNumericId] = useState<string>("9025719963");
  const [needsBotStart, setNeedsBotStart] = useState(false);
  const [sessionKey, setSessionKey] = useState<string>("");
  const [autoListening, setAutoListening] = useState(false);

  // Challenge data from server
  const [challengeToken, setChallengeToken] = useState("");
  const [challengeIdentity, setChallengeIdentity] = useState("");
  const [tgProfile, setTgProfile] = useState<TgResolvedProfile | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Step 3: Post-OTP Gmail & Phone Number fields
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const [phoneFieldError, setPhoneFieldError] = useState<string | null>(null);

  // Initialize modal & fetch bot info + immediately start listening for Bot /start
  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setOtpCode("");
      setError(null);
      setEmailFieldError(null);
      setPhoneFieldError(null);
      setNeedsBotStart(false);
      setAutoListening(true);
      const newKey = `otp_${Math.random().toString(36).slice(2, 10)}`;
      setSessionKey(newKey);

      getTelegramBotInfoServer()
        .then((info) => {
          if (info.botUsername) setBotUsername(info.botUsername);
          if (info.botNumericId) setBotNumericId(info.botNumericId);
        })
        .catch(() => {});
    } else {
      setAutoListening(false);
    }
  }, [isOpen]);

  // Listen for Official Telegram Direct Phone Push callback (oauth.telegram.org postMessage)
  useEffect(() => {
    if (!isOpen) return;
    function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://oauth.telegram.org") return;
      try {
        const payload =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (payload?.event === "auth_result" && payload?.result?.id) {
          const r = payload.result;
          setTgProfile({
            chatId: String(r.id),
            firstName: r.first_name || "Telegram User",
            lastName: r.last_name || "",
            username: r.username || `tg_${r.id}`,
            avatarUrl: r.photo_url || undefined,
          });
          setStep("complete_profile");
        }
      } catch {
        // ignore non-json message
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen]);

  // Real-time auto-polling: the exact moment the user opens the bot / taps Start,
  // our server automatically sends the 6-digit OTP and moves the UI to Step 2!
  useEffect(() => {
    if (!isOpen || step !== "input" || !autoListening || !sessionKey) return;

    const interval = setInterval(async () => {
      try {
        const res = await pollTelegramDeepLinkOtpServer({
          data: {
            sessionKey,
            identifier: identifier.trim(),
            purpose: "login",
          },
        });
        if (res.ok) {
          setAutoListening(false);
          setNeedsBotStart(false);
          setError(null);
          setChallengeToken(res.challengeToken);
          setChallengeIdentity(res.challengeIdentity);
          setTgProfile(res.profile);
          setContactEmail(res.profile.savedEmail || "");
          setContactPhone(res.profile.savedPhone || "");
          setOtpCode("");
          setStep("otp");
          setCooldown(45);
        }
      } catch {
        // ignore poll error
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [isOpen, step, autoListening, sessionKey, identifier]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function handleRequestOtp(e?: FormEvent) {
    if (e) e.preventDefault();
    const clean = identifier.trim();
    if (!clean || clean.length < 2) {
      setError("আপনার টেলিগ্রাম @username অথবা Chat ID লিখুন");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNeedsBotStart(false);

      const res = await requestTelegramBotOtpServer({
        data: { identifier: clean, purpose: "login" },
      });

      if (res.botUsername) {
        setBotUsername(res.botUsername);
      }

      if (!res.ok) {
        setNeedsBotStart(Boolean(res.needsBotStart));
        setAutoListening(true);
        setError(res.error);
        return;
      }

      setChallengeToken(res.challengeToken);
      setChallengeIdentity(res.challengeIdentity);
      setTgProfile(res.profile);
      setContactEmail(res.profile.savedEmail || "");
      setContactPhone(res.profile.savedPhone || "");
      setOtpCode("");
      setStep("otp");
      setCooldown(45);
    } catch (err: any) {
      setError(err?.message || "টেলিগ্রামে OTP পাঠাতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (otpCode.length < 6) {
      setError("টেলিগ্রামে যাওয়া ৬ সংখ্যার সম্পূর্ণ OTP কোডটি দিন");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await verifyTelegramBotOtpServer({
        data: {
          challengeIdentity,
          code: otpCode,
          challengeToken,
          purpose: "login",
        },
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      const existingEmail = (tgProfile?.savedEmail || "").trim();
      const existingPhone = (tgProfile?.savedPhone || "").trim();
      const hasRealEmail =
        existingEmail.includes("@") && !existingEmail.endsWith("@telegram.org");
      const hasRealPhone = existingPhone.replace(/[^0-9]/g, "").length >= 8;

      // If this Telegram user already has their Gmail & Phone saved in our system, log them in directly!
      if (hasRealEmail && hasRealPhone) {
        const numericId =
          Number(String(tgProfile?.chatId || "").replace(/[^0-9]/g, "")) ||
          Math.floor(Date.now() / 1000);

        const user = await handleTelegramAuth({
          id: numericId,
          custom_id: tgProfile?.supabaseUserId || `tg_${numericId}`,
          first_name: tgProfile?.firstName || identifier.replace(/^@/, ""),
          last_name: tgProfile?.lastName || undefined,
          username: tgProfile?.username || identifier.replace(/^@/, ""),
          email: existingEmail,
          phone_number: existingPhone,
          photo_url: tgProfile?.avatarUrl,
          auth_date: Math.floor(Date.now() / 1000),
          hash: challengeToken,
        });

        onSuccess(user);
        onClose();
        return;
      }

      // Otherwise, transition to Step 3 to collect their Gmail & Phone Number!
      setContactEmail(hasRealEmail ? existingEmail : "");
      setContactPhone(hasRealPhone ? existingPhone : "");
      setEmailFieldError(null);
      setPhoneFieldError(null);
      setStep("complete_profile");
    } catch (err: any) {
      setError(err?.message || "OTP ভেরিফাই করা যায়নি।");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailFieldError(null);
    setPhoneFieldError(null);
    setError(null);

    const cleanEmail = contactEmail.trim().toLowerCase();
    const cleanPhone = contactPhone.trim();
    const phoneDigits = cleanPhone.replace(/[^0-9]/g, "");

    let hasErr = false;
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailFieldError("আপনার সঠিক Gmail অ্যাড্রেস দিন (যেমন: example@gmail.com)");
      hasErr = true;
    }
    if (!cleanPhone || phoneDigits.length < 8) {
      setPhoneFieldError("আপনার সঠিক মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)");
      hasErr = true;
    }
    if (hasErr) return;

    try {
      setLoading(true);
      const chatId = String(tgProfile?.chatId || Math.floor(Date.now() / 1000));
      const firstName = tgProfile?.firstName || identifier.replace(/^@/, "") || "Telegram User";
      const lastName = tgProfile?.lastName || "";
      const username = tgProfile?.username || identifier.replace(/^@/, "");

      const saved = await saveTelegramUserProfileServer({
        data: {
          chatId,
          username,
          firstName,
          lastName,
          email: cleanEmail,
          phone: cleanPhone,
          avatarUrl: tgProfile?.avatarUrl,
        },
      });

      const numericId =
        Number(chatId.replace(/[^0-9]/g, "")) || Math.floor(Date.now() / 1000);

      const user = await handleTelegramAuth({
        id: numericId,
        custom_id: saved.userId || `tg_${numericId}`,
        first_name: firstName,
        last_name: lastName || undefined,
        username: username || undefined,
        email: saved.email,
        phone_number: saved.phone,
        photo_url: saved.avatarUrl || tgProfile?.avatarUrl,
        auth_date: Math.floor(Date.now() / 1000),
        hash: challengeToken || `tg_verified_${Date.now()}`,
      });

      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err?.message || "প্রোফাইল সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }

  const fullNameDisplay =
    [tgProfile?.firstName, tgProfile?.lastName].filter(Boolean).join(" ") ||
    tgProfile?.username ||
    "Telegram User";

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tg-otp-modal-title"
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

          {/* Frosted Glass Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              background: "rgba(10, 22, 40, 0.88)",
              backdropFilter: "blur(24px) saturate(150%)",
              WebkitBackdropFilter: "blur(24px) saturate(150%)",
              border: "1px solid rgba(56, 189, 248, 0.28)",
              boxShadow:
                "inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 30px 80px rgba(0, 0, 0, 0.75), 0 0 45px rgba(34, 158, 217, 0.2)",
            }}
            className="relative z-10 w-full max-w-[440px] rounded-[24px] p-6 sm:p-7 text-white"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {step === "input" ? (
              <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#229ED9]/20 border border-[#229ED9]/40 flex items-center justify-center text-[#38bdf8] shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      id="tg-otp-modal-title"
                      className="font-display text-[21px] font-semibold tracking-tight leading-tight"
                    >
                      <span className="text-white">Telegram </span>
                      <span className="bg-gradient-to-r from-[#7dd3fc] to-[#38bdf8] bg-clip-text text-transparent">
                        Bot OTP Login
                      </span>
                    </h3>
                    <p className="text-[12px] text-white/55">
                      আমাদের টেলিগ্রাম বট Start করলেই সাথে সাথে ৬ সংখ্যার OTP পাবেন
                    </p>
                  </div>
                </div>

                {/* STEP 1: 1-CLICK START BOT -> INSTANT AUTO OTP */}
                <div className="rounded-2xl bg-gradient-to-r from-[#229ED9]/20 to-[#38bdf8]/10 border border-[#38bdf8]/35 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7dd3fc]">
                      <Sparkles className="w-3.5 h-3.5" /> ধাপ ১: বট Start করে সাথে সাথে OTP নিন
                    </span>
                  </div>
                  <p className="text-[11.5px] text-white/85 leading-relaxed">
                    নিচের বাটনে ক্লিক করে টেলিগ্রামে গিয়ে শুধু <strong>Start</strong> চাপুন — সাথে সাথে অটোমেটিক আপনার টেলিগ্রামে ৬ সংখ্যার OTP চলে যাবে এবং এই পেজে কোড বসানোর ঘর ওপেন হয়ে যাবে:
                  </p>
                  {botUsername ? (
                    <a
                      href={`https://t.me/${botUsername}?start=${sessionKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setAutoListening(true)}
                      className="w-full h-10 rounded-xl bg-[#229ED9] hover:bg-[#1e8ec4] text-white font-semibold text-[12.5px] flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(34,158,217,0.4)] transition-all"
                    >
                      <Send className="w-4 h-4" />
                      <span>@{botUsername} ওপেন করে Start চাপুন</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-2.5 text-[11.5px] text-amber-200">
                      ⚠️ অ্যাডমিন প্যানেলে (<strong>/admin/telegram</strong>) গিয়ে আপনার বটের <strong>Bot Token</strong> সেভ করলেই এখানে সরাসরি বট Start করার বাটন চলে আসবে।
                    </div>
                  )}
                  {autoListening && botUsername && (
                    <p className="text-[11px] text-[#7dd3fc] flex items-center justify-center gap-1.5 pt-0.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>বটে Start চাপার জন্য অপেক্ষা করা হচ্ছে... (Start চাপলেই অটো OTP যাবে)</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    অথবা বট Start করা থাকলে Send OTP চাপুন
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <InputField
                  label="Telegram Username or Chat ID"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="@yourusername অথবা 123456789"
                  autoFocus
                  icon={<Send className="w-4 h-4" />}
                  error={error}
                />

                {needsBotStart && botUsername && (
                  <p className="text-[11px] text-amber-300 text-center">
                    উপরে নীল রঙের <strong>@{botUsername} ওপেন করে Start চাপুন</strong> বাটনে ক্লিক করে বটটি Start করে নিন।
                  </p>
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
                        <span>Send 6-Digit OTP</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            ) : step === "otp" ? (
              /* STEP 2: VERIFY TELEGRAM OTP VIA V15 LIGHT OTPCARD */
              <div className="flex justify-center">
                <OtpCard
                  length={6}
                  maskedIdentifier={
                    tgProfile?.savedEmail ||
                    (tgProfile?.username ? `@${tgProfile.username.replace(/^@/, "")}` : identifier) ||
                    "s•••••@gmail.com"
                  }
                  demoMode={false}
                  fullScreen={false}
                  onChangeEmail={() => setStep("input")}
                  onVerify={async (enteredCode) => {
                    const res = await verifyTelegramBotOtpServer({
                      data: {
                        challengeIdentity,
                        code: enteredCode,
                        challengeToken,
                        purpose: "login",
                      },
                    });
                    return Boolean(res.ok);
                  }}
                  onResend={async () => {
                    await handleRequestOtp();
                  }}
                  onSuccess={async () => {
                    const existingEmail = (tgProfile?.savedEmail || "").trim();
                    const existingPhone = (tgProfile?.savedPhone || "").trim();
                    const hasRealEmail =
                      existingEmail.includes("@") && !existingEmail.endsWith("@telegram.org");
                    const hasRealPhone = existingPhone.replace(/[^0-9]/g, "").length >= 8;

                    if (hasRealEmail && hasRealPhone) {
                      const numericId =
                        Number(String(tgProfile?.chatId || "").replace(/[^0-9]/g, "")) ||
                        Math.floor(Date.now() / 1000);
                      const user = await handleTelegramAuth({
                        id: numericId,
                        custom_id: tgProfile?.supabaseUserId || `tg_${numericId}`,
                        first_name: tgProfile?.firstName || identifier.replace(/^@/, ""),
                        last_name: tgProfile?.lastName || undefined,
                        username: tgProfile?.username || identifier.replace(/^@/, ""),
                        email: existingEmail,
                        phone_number: existingPhone,
                        photo_url: tgProfile?.avatarUrl,
                        auth_date: Math.floor(Date.now() / 1000),
                        hash: challengeToken,
                      });
                      onSuccess(user);
                      onClose();
                      return;
                    }

                    setContactEmail(hasRealEmail ? existingEmail : "");
                    setContactPhone(hasRealPhone ? existingPhone : "");
                    setEmailFieldError(null);
                    setPhoneFieldError(null);
                    setStep("complete_profile");
                  }}
                />
              </div>
            ) : (
              /* STEP 3: COMPLETE PROFILE (COLLECT GMAIL & PHONE NUMBER ON FIRST TELEGRAM LOGIN) */
              <form onSubmit={handleCompleteProfileSubmit} className="space-y-4" noValidate>
                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                  <div className="relative shrink-0">
                    {tgProfile?.avatarUrl ? (
                      <img
                        src={tgProfile.avatarUrl}
                        alt={fullNameDisplay}
                        className="w-13 h-13 rounded-2xl object-cover border border-[#38bdf8]/50 shadow-[0_0_16px_rgba(56,189,248,0.25)]"
                      />
                    ) : (
                      <div className="w-13 h-13 rounded-2xl bg-[#229ED9]/25 border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8]">
                        <UserIcon className="w-6 h-6" />
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#0a1628]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-semibold text-[16px] text-white truncate">
                        {fullNameDisplay}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> OTP Verified
                      </span>
                    </div>
                    <p className="text-[11.5px] text-white/55 truncate">
                      {tgProfile?.username ? `@${tgProfile.username.replace(/^@/, "")}` : `Telegram ID: ${tgProfile?.chatId}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-display text-[19px] font-semibold">
                    <span className="text-white">Complete Your </span>
                    <span className="bg-gradient-to-r from-[#7dd3fc] to-[#38bdf8] bg-clip-text text-transparent">
                      Account Info
                    </span>
                  </h3>
                  <p className="text-[12px] text-white/60 leading-relaxed">
                    আপনার অর্ডারের আপডেট ও অ্যাক্সেস পেতে আপনার <strong>Gmail</strong> এবং <strong>মোবাইল নাম্বার</strong> দিন (শুধু প্রথমবার দিতে হবে):
                  </p>
                </div>

                <InputField
                  label="আপনার Gmail অ্যাড্রেস (Gmail Address)"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => {
                    setContactEmail(e.target.value);
                    if (emailFieldError) setEmailFieldError(null);
                  }}
                  placeholder="yourname@gmail.com"
                  autoFocus
                  icon={<Mail className="w-4 h-4" />}
                  error={emailFieldError}
                />

                <InputField
                  label="মোবাইল / WhatsApp নাম্বার (Phone Number)"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => {
                    setContactPhone(e.target.value);
                    if (phoneFieldError) setPhoneFieldError(null);
                  }}
                  placeholder="017XXXXXXXX"
                  icon={<Phone className="w-4 h-4" />}
                  error={phoneFieldError}
                />

                {error && (
                  <p className="text-[12px] text-rose-400 text-center font-medium">
                    {error}
                  </p>
                )}

                <motion.button
                  type="submit"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  style={{
                    background:
                      "linear-gradient(90deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)",
                    boxShadow: "0 8px 25px rgba(14, 165, 233, 0.45)",
                  }}
                  className="w-full h-11 rounded-[12px] text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>অ্যাকাউন্ট যুক্ত করুন ও লগইন করুন</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

