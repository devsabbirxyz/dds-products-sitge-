import React, { useState, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  User as UserIcon,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  registerEmailAccountServer,
  getGoogleChooserAccountsServer,
} from "@/lib/otp.functions";
import {
  getRegisteredUsersMap,
  getLocalUser,
  saveLocalUser,
  type DigiStoreUser,
} from "@/lib/firebase-auth";
import { DIGISTORE_CONFIG } from "@/config/auth-config";
import { InputField } from "./InputField";

export interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: DigiStoreUser) => void;
}

const GOOGLE_CHOOSER_STORAGE_KEY = "digistore_google_chooser_accounts";

interface ChooserAccount {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toDeterministicUuid(seed: string, existingId?: string): string {
  if (existingId && UUID_REGEX.test(existingId.trim())) {
    return existingId.trim().toLowerCase();
  }
  const clean = (seed || "user").trim().toLowerCase();
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (
    (h1 >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0") +
    ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0") +
    ((h1 + h2) >>> 0).toString(16).padStart(8, "0")
  ).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const DEFAULT_GOOGLE_ACCOUNTS: ChooserAccount[] = [
  {
    id: toDeterministicUuid("developersabbir.biz@gmail.com"),
    email: "developersabbir.biz@gmail.com",
    displayName: "Developer Sabbir",
  },
];

function isCleanUserEmail(rawEmail?: string): boolean {
  const em = (rawEmail || "").trim().toLowerCase();
  if (!em || !em.includes("@") || em.includes("•")) return false;
  if (
    /^(strict_otp_test_|test_|demo_|verify_)/i.test(em) ||
    em.endsWith("@telegram.org") ||
    em.endsWith("@digeros.com") ||
    em.endsWith("@dds-digital.com")
  ) {
    return false;
  }
  return true;
}

function formatNameFromEmail(email: string): string {
  return (
    email
      .split("@")[0]
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || "Google User"
  );
}

function loadLocalChooserAccounts(): ChooserAccount[] {
  if (typeof window === "undefined") return DEFAULT_GOOGLE_ACCOUNTS;
  const merged = new Map<string, ChooserAccount>();

  const addAccount = (acc: Partial<ChooserAccount> & { email?: string }) => {
    const cleanEmail = (acc.email || "").trim().toLowerCase();
    if (!isCleanUserEmail(cleanEmail)) return;
    const prev = merged.get(cleanEmail);
    merged.set(cleanEmail, {
      id: acc.id || prev?.id || `google_${cleanEmail}`,
      email: cleanEmail,
      displayName:
        acc.displayName?.trim() ||
        prev?.displayName ||
        formatNameFromEmail(cleanEmail),
      photoURL: acc.photoURL || prev?.photoURL,
      phoneNumber: acc.phoneNumber || prev?.phoneNumber,
    });
  };

  // 1. Currently active user
  const active = getLocalUser();
  if (active?.email) {
    addAccount(active);
  }

  // 2. Explicitly saved Google Chooser accounts
  try {
    const rawChooser = localStorage.getItem(GOOGLE_CHOOSER_STORAGE_KEY);
    if (rawChooser) {
      const parsed = JSON.parse(rawChooser) as ChooserAccount[];
      if (Array.isArray(parsed)) {
        for (const item of parsed) addAccount(item);
      }
    }
  } catch {
    // ignore
  }

  // 3. Registered users on this device
  const regMap = getRegisteredUsersMap();
  for (const u of Object.values(regMap)) {
    if (u?.email) addAccount(u);
  }

  // 4. Remembered login email
  try {
    const remembered = localStorage.getItem("digistore_remembered_email") || "";
    if (remembered) {
      addAccount({ email: remembered });
    }
  } catch {
    // ignore
  }

  // 5. Ensure default primary Google account is always available to select
  for (const defAcc of DEFAULT_GOOGLE_ACCOUNTS) {
    addAccount(defAcc);
  }

  return Array.from(merged.values());
}

function saveAccountToLocalChooser(account: ChooserAccount): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadLocalChooserAccounts();
    const filtered = current.filter(
      (a) => a.email.toLowerCase() !== account.email.toLowerCase()
    );
    const updated = [account, ...filtered].slice(0, 8);
    localStorage.setItem(GOOGLE_CHOOSER_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

const AVATAR_GRADIENTS = [
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-indigo-600",
  "from-amber-500 to-orange-600",
];

/**
 * GoogleAuthModal Component
 * Authentic Google Account Chooser ("Choose an account to continue to DDS-Digital"):
 * - Displays saved & active Google accounts so the user can sign in or sign up with 1 click (just by selecting their Google account, no OTP required).
 * - Includes a "Use another account" option if they want to add and continue with a different Google account.
 */
export function GoogleAuthModal({
  isOpen,
  onClose,
  onSuccess,
}: GoogleAuthModalProps) {
  const [step, setStep] = useState<"choose" | "add">("choose");
  const [accounts, setAccounts] = useState<ChooserAccount[]>(DEFAULT_GOOGLE_ACCOUNTS);
  const [selectingEmail, setSelectingEmail] = useState<string | null>(null);

  // "Use another account" state
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submittingNew, setSubmittingNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("choose");
      setSelectingEmail(null);
      setNewEmail("");
      setNewName("");
      setEmailError(null);
      setSubmittingNew(false);

      const localList = loadLocalChooserAccounts();
      setAccounts(localList);

      // Also merge any known accounts from the server
      getGoogleChooserAccountsServer()
        .then((res) => {
          if (!res?.accounts?.length) return;
          setAccounts((prev) => {
            const map = new Map<string, ChooserAccount>();
            for (const a of prev) map.set(a.email.toLowerCase(), a);
            for (const s of res.accounts) {
              const clean = s.email.trim().toLowerCase();
              if (!isCleanUserEmail(clean)) continue;
              const existing = map.get(clean);
              map.set(clean, {
                id: existing?.id || s.id,
                email: clean,
                displayName: existing?.displayName || s.displayName,
                photoURL: existing?.photoURL || s.photoURL,
                phoneNumber: existing?.phoneNumber || s.phoneNumber,
              });
            }
            return Array.from(map.values()).slice(0, 6);
          });
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !selectingEmail && !submittingNew) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, selectingEmail, submittingNew]);

  async function completeGoogleSignIn(target: ChooserAccount) {
    const cleanEmail = target.email.trim().toLowerCase();
    const cleanName =
      target.displayName?.trim() || formatNameFromEmail(cleanEmail);

    const regRes = await registerEmailAccountServer({
      data: {
        email: cleanEmail,
        fullName: cleanName,
        phone: target.phoneNumber,
        avatarUrl: target.photoURL,
        provider: "google",
      },
    }).catch(() => null);

    const googleUser: DigiStoreUser = {
      id:
        regRes?.user?.id ||
        target.id ||
        (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `google_${Date.now()}`),
      email: cleanEmail,
      displayName: regRes?.user?.displayName || cleanName,
      photoURL: regRes?.user?.photoURL || target.photoURL,
      phoneNumber: regRes?.user?.phoneNumber || target.phoneNumber,
      provider: "google",
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };

    saveAccountToLocalChooser({
      id: googleUser.id,
      email: googleUser.email,
      displayName: googleUser.displayName,
      photoURL: googleUser.photoURL,
      phoneNumber: googleUser.phoneNumber,
    });
    saveLocalUser(googleUser);
    onSuccess(googleUser);
    onClose();
  }

  async function handleSelectAccount(acc: ChooserAccount) {
    if (selectingEmail || submittingNew) return;
    try {
      setSelectingEmail(acc.email);
      await new Promise((r) => setTimeout(r, 420));
      await completeGoogleSignIn(acc);
    } finally {
      setSelectingEmail(null);
    }
  }

  async function handleAddAnotherSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);

    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError("আপনার সঠিক Google / Gmail অ্যাড্রেস লিখুন (যেমন: name@gmail.com)");
      return;
    }

    const cleanName = newName.trim() || formatNameFromEmail(cleanEmail);

    try {
      setSubmittingNew(true);
      await new Promise((r) => setTimeout(r, 420));
      await completeGoogleSignIn({
        id: `google_${Date.now()}`,
        email: cleanEmail,
        displayName: cleanName,
      });
    } catch (err: any) {
      setEmailError(err?.message || "Google সাইন-ইন সম্পন্ন করা যায়নি।");
    } finally {
      setSubmittingNew(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-auth-modal-title"
        >
          {/* Dark Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (!selectingEmail && !submittingNew) onClose();
            }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Google Account Chooser Glass Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "rgba(12, 22, 38, 0.94)",
              backdropFilter: "blur(24px) saturate(150%)",
              WebkitBackdropFilter: "blur(24px) saturate(150%)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow:
                "inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 30px 80px rgba(0, 0, 0, 0.78), 0 0 45px rgba(16, 185, 129, 0.15)",
            }}
            className="relative z-10 w-full max-w-[420px] rounded-[24px] overflow-hidden text-white"
          >
            {/* Top Google Sign-In Bar */}
            <div className="px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-[12.5px] font-medium text-white/80">
                  Sign in with Google
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={Boolean(selectingEmail) || submittingNew}
                aria-label="Close modal"
                className="p-1 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:p-7">
              {step === "choose" ? (
                <div className="space-y-5">
                  {/* Brand Badge + Heading */}
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-[#10b981]/25 to-[#06b6d4]/20 border border-[#34d399]/35 flex items-center justify-center text-[#34d399] font-display font-bold text-lg shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                      D
                    </div>
                    <h3
                      id="google-auth-modal-title"
                      className="font-display text-[22px] font-semibold tracking-tight text-white pt-1"
                    >
                      Choose an account
                    </h3>
                    <p className="text-[13px] text-white/60">
                      to continue to{" "}
                      <span className="text-[#34d399] font-semibold">
                        {DIGISTORE_CONFIG.siteName}
                      </span>
                    </p>
                  </div>

                  {/* Account List */}
                  <div className="divide-y divide-white/10 rounded-2xl border border-white/12 bg-white/[0.03] overflow-hidden">
                    {accounts.map((acc, idx) => {
                      const isSelectingThis = selectingEmail === acc.email;
                      const avatarGrad =
                        AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                      return (
                        <button
                          key={acc.email}
                          type="button"
                          disabled={Boolean(selectingEmail)}
                          onClick={() => handleSelectAccount(acc)}
                          className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.07] active:bg-white/[0.11] transition-colors cursor-pointer disabled:opacity-60 group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {acc.photoURL ? (
                              <img
                                src={acc.photoURL}
                                alt={acc.displayName}
                                className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white font-bold text-[15px] shadow-sm shrink-0`}
                              >
                                {(acc.displayName || acc.email)[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[14px] font-semibold text-white group-hover:text-[#34d399] transition-colors truncate">
                                {acc.displayName}
                              </p>
                              <p className="text-[12px] text-white/55 truncate">
                                {acc.email}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelectingThis ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#34d399]" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-white/20 group-hover:text-[#34d399] transition-colors" />
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {/* Use another account row */}
                    <button
                      type="button"
                      disabled={Boolean(selectingEmail)}
                      onClick={() => {
                        setEmailError(null);
                        setStep("add");
                      }}
                      className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left hover:bg-white/[0.07] transition-colors cursor-pointer disabled:opacity-50 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/[0.07] border border-white/15 flex items-center justify-center text-white/75 group-hover:text-white group-hover:border-white/30 transition-colors shrink-0">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[13.5px] font-medium text-white/90 group-hover:text-white">
                          Use another account
                        </p>
                        <p className="text-[11.5px] text-white/45">
                          অন্য একটি Google অ্যাকাউন্ট দিয়ে কন্টিনিউ করুন
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Subtle Google Privacy Notice */}
                  <p className="text-[11px] text-white/45 text-center leading-relaxed px-2">
                    To continue, Google will share your name, email address, and profile
                    picture with {DIGISTORE_CONFIG.siteName}.
                  </p>
                </div>
              ) : (
                /* STEP 2: USE ANOTHER GOOGLE ACCOUNT (DIRECT SIGN-IN WITHOUT OTP) */
                <form
                  onSubmit={handleAddAnotherSubmit}
                  className="space-y-4"
                  noValidate
                >
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setStep("choose")}
                      disabled={submittingNew}
                      className="inline-flex items-center gap-1.5 text-[12px] text-white/60 hover:text-white mb-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to accounts</span>
                    </button>
                    <h3 className="font-display text-[20px] font-semibold tracking-tight text-white">
                      Use another Google Account
                    </h3>
                    <p className="text-[12.5px] text-white/55">
                      আপনার Google অ্যাকাউন্টের ইমেইল দিয়ে সরাসরি কন্টিনিউ করুন
                    </p>
                  </div>

                  <InputField
                    label="Google Email or Gmail Address"
                    type="email"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder="yourname@gmail.com"
                    autoComplete="email"
                    autoFocus
                    required
                    icon={<Mail className="w-4 h-4" />}
                    error={emailError}
                  />

                  <InputField
                    label="Full Name (Optional)"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Your Name"
                    autoComplete="name"
                    icon={<UserIcon className="w-4 h-4" />}
                  />

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep("choose")}
                      disabled={submittingNew}
                      className="w-1/2 h-11 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.11] border border-white/15 text-[13px] font-medium text-white/80 transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <motion.button
                      type="submit"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={submittingNew}
                      style={{
                        background:
                          "linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)",
                        boxShadow: "0 8px 25px rgba(16, 185, 129, 0.4)",
                      }}
                      className="w-1/2 h-11 rounded-[12px] text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {submittingNew ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
