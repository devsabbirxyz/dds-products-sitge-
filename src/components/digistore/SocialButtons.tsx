import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { DIGISTORE_CONFIG } from "@/config/auth-config";
import {
  signInWithGoogle,
  handleTelegramAuth,
  type DigiStoreUser,
  type TelegramAuthData,
} from "@/lib/firebase-auth";
import { TelegramOtpModal } from "./TelegramOtpModal";
import { GoogleAuthModal } from "./GoogleAuthModal";

declare global {
  interface Window {
    onTelegramAuthCallback?: (user: TelegramAuthData) => void;
  }
}

export interface SocialButtonsProps {
  onSuccess: (user: DigiStoreUser, providerName: string) => void;
  onError: (errorMessage: string) => void;
  disabled?: boolean;
  redirectUrl?: string;
}

/**
 * SocialButtons Component
 * - Strictly TWO side-by-side buttons (50/50 equal width): Google | Telegram
 * - Google: Opens Google Account Chooser + real 6-digit Gmail OTP modal (or Firebase Google Popup when live Firebase API key is configured).
 * - Telegram: Opens the frosted glass Telegram OTP Modal where the user enters their @username or ID,
 *   and receives a 6-digit OTP directly from the site's Telegram Bot!
 */
export function SocialButtons({
  onSuccess,
  onError,
  disabled = false,
  redirectUrl = "/dashboard",
}: SocialButtonsProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isTgModalOpen, setIsTgModalOpen] = useState(false);
  const telegramWidgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.onTelegramAuthCallback = async (tgUser: TelegramAuthData) => {
      try {
        const user = await handleTelegramAuth(tgUser);
        onSuccess(user, "Telegram");
      } catch (err: any) {
        onError(err.message || "Telegram authentication failed.");
      }
    };

    const container = telegramWidgetRef.current;
    const botUsername = DIGISTORE_CONFIG.telegram.botUsername.replace(/^@/, "");
    if (container && botUsername && botUsername !== "YOUR_BOT_USERNAME") {
      container.innerHTML = "";
      const script = document.createElement("script");
      script.src = DIGISTORE_CONFIG.telegram.widgetScriptUrl;
      script.async = true;
      script.setAttribute("data-telegram-login", botUsername);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-onauth", "onTelegramAuthCallback(user)");
      script.setAttribute("data-request-access", "write");
      container.appendChild(script);
    }

    return () => {
      delete window.onTelegramAuthCallback;
    };
  }, [onSuccess, onError]);

  async function handleGoogleClick() {
    if (disabled || googleLoading) return;
    const fbKey = DIGISTORE_CONFIG.firebase.apiKey || "";
    const hasLiveFirebase =
      fbKey.trim() !== "" &&
      !fbKey.includes("YOUR_FIREBASE_API_KEY_HERE") &&
      !DIGISTORE_CONFIG.firebase.projectId.includes("digistore-marketplace");

    if (!hasLiveFirebase) {
      setIsGoogleModalOpen(true);
      return;
    }

    try {
      setGoogleLoading(true);
      const { user, redirecting } = await signInWithGoogle(redirectUrl);
      if (redirecting) {
        return;
      }
      if (user) {
        onSuccess(user, "Google");
      }
    } catch {
      // Fallback to Google Gmail OTP modal if Firebase popup is blocked or unavailable
      setIsGoogleModalOpen(true);
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleTelegramClick() {
    if (disabled || googleLoading) return;
    setIsTgModalOpen(true);
  }

  const isBusy = disabled || googleLoading;

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3">
        {/* LEFT: Google Button */}
        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleClick}
          disabled={isBusy}
          aria-label="Continue with Google"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
          className="h-[44px] rounded-[12px] px-4 flex items-center justify-center gap-2.5 text-[13px] font-medium text-white/90 hover:bg-white/[0.11] hover:border-white/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] cursor-pointer"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white/80" />
          ) : (
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
          )}
          <span>Google</span>
        </motion.button>

        {/* RIGHT: Telegram Button (Opens Telegram Bot OTP Modal) */}
        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleTelegramClick}
          disabled={isBusy}
          aria-label="Continue with Telegram"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
          className="h-[44px] rounded-[12px] px-4 flex items-center justify-center gap-2.5 text-[13px] font-medium text-white/90 hover:bg-white/[0.11] hover:border-white/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] cursor-pointer"
        >
          <svg
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="#229ED9"
            aria-hidden="true"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
          <span>Telegram</span>
        </motion.button>
      </div>

      {/* Google Account Chooser + Gmail 6-Digit OTP Modal */}
      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccess={(user) => onSuccess(user, "Google")}
      />

      {/* Telegram Bot OTP Login Modal */}
      <TelegramOtpModal
        isOpen={isTgModalOpen}
        onClose={() => setIsTgModalOpen(false)}
        onSuccess={(user) => onSuccess(user, "Telegram")}
      />

      {/* Hidden container for official Telegram Login Widget script */}
      <div
        ref={telegramWidgetRef}
        data-telegram-login={DIGISTORE_CONFIG.telegram.botUsername}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
