"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { ProgressLockRing } from "./ProgressLockRing";
import { OtpInput } from "./OtpInput";
import { ResendTimer } from "./ResendTimer";
import { AuthBackground } from "@/components/digistore/AuthBackground";
import { GlassCard } from "@/components/digistore/GlassCard";
import { DIGISTORE_CONFIG } from "@/config/auth-config";
import { useOtp } from "@/hooks/useOtp";

export type OtpCardProps = {
  length?: 4 | 6; // default 6
  maskedIdentifier?: string; // e.g. "taxonaj676@digeros.com" or "s•••••@gmail.com"
  identifier?: string; // alias for maskedIdentifier
  demoMode?: boolean; // default true
  autoPlay?: boolean; // default false
  fullScreen?: boolean; // default true
  initialCooldown?: number; // default 30
  demoHintCode?: string; // optional override for demo hint code
  buttonLabel?: string; // default "Verify & Create Account"
  onChangeEmail?: () => void;
  onVerify?: (code: string) => Promise<boolean>;
  onResend?: () => Promise<void>;
  onSuccess?: () => void;
};

const VERIFIED_TITLE_CHARS = "You're verified".split("");

/**
 * CharacterBlurTitle (OTP Animation V15 + Site Two-Tone Heading)
 * Uses pure GPU opacity + y transitions for silky 60fps title swaps.
 */
function CharacterBlurTitle({
  isSuccess,
  prefersReducedMotion,
}: {
  isSuccess: boolean;
  prefersReducedMotion: boolean | null;
}) {
  return (
    <div className="relative flex h-[36px] items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        {!isSuccess ? (
          <motion.h1
            key="title-verify"
            data-testid="otp-title"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 4 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    y: -3,
                    transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
                  }
            }
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[26px] sm:text-[28px] font-bold tracking-tight text-center leading-tight transform-gpu"
          >
            <span className="text-white">Verify </span>
            <span className="bg-gradient-to-r from-[#34d399] via-[#10b981] to-[#22d3ee] bg-clip-text text-transparent">
              Email
            </span>
          </motion.h1>
        ) : (
          <motion.h1
            key="title-verified"
            data-testid="otp-title"
            aria-label="You're verified"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            variants={{
              hidden: { opacity: 1 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: prefersReducedMotion ? 0 : 0.028,
                },
              },
            }}
            className="font-display flex items-center justify-center text-center text-[26px] sm:text-[28px] font-bold tracking-tight leading-tight text-white transform-gpu"
          >
            {VERIFIED_TITLE_CHARS.map((ch, idx) => (
              <motion.span
                key={idx}
                variants={{
                  hidden: prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 5, scale: 0.94 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      duration: 0.24,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}
                style={{
                  color: idx >= 7 ? "#34D399" : "#FFFFFF",
                }}
                className="inline-block transform-gpu"
              >
                {ch === " " ? "\u00A0" : ch}
              </motion.span>
            ))}
          </motion.h1>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * OtpCard (Main 6-Digit Component combining Site Obsidian-Emerald-Cyan Glass Theme + Silky 60fps V15 Animations)
 */
export function OtpCard({
  length = 6,
  maskedIdentifier,
  identifier,
  demoMode = false,
  autoPlay = false,
  fullScreen = true,
  initialCooldown = 30,
  buttonLabel = "Verify & Create Account",
  onChangeEmail,
  onVerify,
  onResend,
  onSuccess,
}: OtpCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const targetIdentifier =
    maskedIdentifier || identifier || "taxonaj676@digeros.com";

  const {
    state,
    filledCount,
    isComplete,
    inputRefs,
    focusBox,
    handleDigitInput,
    handleKeyDown,
    handlePaste,
    submitVerification,
    triggerResend,
  } = useOtp({
    length,
    identifier: targetIdentifier,
    demoMode,
    autoPlay,
    initialCooldown,
    onVerify,
    onResend,
    onSuccess,
  });

  const isSuccess = state.status === "success";
  const isError = state.status === "error";
  const isReset = state.status === "reset" || state.isClearingError;
  const isVerifying = state.status === "verifying";
  const isReady =
    (state.status === "typing" || state.status === "idle") && isComplete;

  const handlePrimaryButtonClick = () => {
    if (isSuccess) {
      onSuccess?.();
      return;
    }
    if (isReady && !isVerifying) {
      void submitVerification();
    }
  };

  const innerContent = (
    <div
      data-testid="otp-card"
      data-status={state.status}
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.closest("button") ||
            target.closest("a") ||
            target.tagName === "INPUT")
        ) {
          return;
        }
        if (!isSuccess) {
          inputRefs.current[state.activeIndex]?.focus();
        }
      }}
      className="otp-v15-scope font-jakarta relative flex w-full flex-col items-center text-center"
    >
      {/* 1. Top Badge (56px circle) + Rotating Progress Ring (72px SVG around it) */}
      <div className="mb-3.5">
        <ProgressLockRing
          status={state.status}
          filledCount={filledCount}
          totalLength={length}
          iconVariant="mail"
        />
      </div>

      {/* 2. Title ("Verify Email" -> character reveal "You're verified") */}
      <div className="w-full">
        <CharacterBlurTitle
          isSuccess={isSuccess}
          prefersReducedMotion={prefersReducedMotion}
        />
      </div>

      {/* 3. Subtitle line + email (swaps to "Your account has been verified." on success) */}
      <div className="mt-1.5 mb-6 flex min-h-[26px] flex-col items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {!isSuccess ? (
            <motion.p
              key="subtitle-unverified"
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 3 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      y: -3,
                      transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
                    }
              }
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-[13px] text-white/60 leading-relaxed transform-gpu"
            >
              Enter the {length}-digit code sent to{" "}
              <strong
                data-testid="otp-masked-identifier"
                className="font-bold text-white"
              >
                {targetIdentifier}
              </strong>
            </motion.p>
          ) : (
            <motion.p
              key="subtitle-verified"
              data-testid="otp-verified-subtitle"
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 4 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.26,
                delay: 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-[13px] font-medium text-emerald-300/90 leading-relaxed transform-gpu"
            >
              Your account has been verified. Redirecting to dashboard...
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* 4. OtpRow (6 boxes, each 52x56px, radius 14px) */}
      <div className="flex w-full flex-col items-center">
        <OtpInput
          digits={state.digits}
          entrySeq={state.entrySeq}
          activeIndex={state.activeIndex}
          status={state.status}
          isGlitching={state.isGlitching}
          isClearingError={state.isClearingError}
          inputRefs={inputRefs}
          onFocusBox={focusBox}
          onDigitInput={handleDigitInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />

        {/* 5. ErrorLine (hidden by default, appears smoothly under the row) */}
        <div
          aria-live="polite"
          className="flex w-full items-center justify-center"
        >
          <AnimatePresence initial={false}>
            {(isError || isReset) && state.errorMessage && !isReset && (
              <motion.div
                key="otp-error-msg"
                data-testid="otp-error-message"
                initial={{ opacity: 0, y: -4, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto", marginTop: 10 }}
                exit={{ opacity: 0, y: -4, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center justify-center gap-1.5 overflow-hidden transform-gpu"
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    backgroundColor: "#EF4444",
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                  className="inline-flex shrink-0 items-center justify-center rounded-full leading-none"
                  aria-hidden="true"
                >
                  !
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "#F87171",
                  }}
                >
                  {state.errorMessage}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 6. PrimaryButton (full width, 48px, radius 12px) */}
      <div className="mt-6 w-full">
        <motion.button
          type="button"
          data-testid="otp-primary-button"
          disabled={!isReady && !isSuccess}
          onClick={handlePrimaryButtonClick}
          whileTap={isReady || isSuccess ? { scale: 0.985 } : undefined}
          style={{
            height: 48,
            borderRadius: 12,
            background: isSuccess
              ? "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)"
              : isReady || isVerifying
                ? "linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)"
                : "linear-gradient(135deg, rgba(5, 150, 105, 0.38) 0%, rgba(16, 185, 129, 0.36) 50%, rgba(6, 182, 212, 0.36) 100%)",
            border: isSuccess
              ? "1px solid rgba(52, 211, 153, 0.45)"
              : isReady || isVerifying
                ? "1px solid rgba(52, 211, 153, 0.45)"
                : "1px solid rgba(16, 185, 129, 0.22)",
            color:
              isSuccess || isReady || isVerifying
                ? "#FFFFFF"
                : "rgba(255, 255, 255, 0.60)",
            boxShadow: isSuccess
              ? "0 10px 26px rgba(34, 197, 94, 0.38)"
              : isReady || isVerifying
                ? "0 8px 30px rgba(16, 185, 129, 0.40)"
                : "none",
            fontSize: 14,
            fontWeight: 700,
          }}
          className="group relative flex w-full items-center justify-center overflow-hidden transition-all duration-200 select-none cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] transform-gpu"
        >
          {/* Error State: emerald-cyan progress fill grows left-to-right */}
          <AnimatePresence>
            {(isError || isReset) && (
              <motion.span
                key="error-reset-progress"
                data-testid="otp-error-progress-bar"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4, ease: "linear" }}
                style={{
                  transformOrigin: "left",
                  background:
                    "linear-gradient(90deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 182, 212, 0.35) 100%)",
                }}
                className="pointer-events-none absolute inset-0 z-0 transform-gpu"
              />
            )}
          </AnimatePresence>

          {/* Button Inner Content */}
          <AnimatePresence mode="wait" initial={false}>
            {isVerifying ? (
              <motion.span
                key="btn-verifying"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 inline-flex items-center justify-center gap-2 transform-gpu"
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    border: "2px solid rgba(255, 255, 255, 0.35)",
                    borderTopColor: "#FFFFFF",
                    animation: "spin 0.7s linear infinite",
                  }}
                  className="inline-block shrink-0"
                />
                <span>Verifying</span>
              </motion.span>
            ) : isSuccess ? (
              <motion.span
                key="btn-continue"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 inline-flex items-center justify-center gap-1.5 transform-gpu"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight
                  size={16}
                  strokeWidth={2.3}
                  className="transition-transform duration-200 group-hover:translate-x-[3px]"
                />
              </motion.span>
            ) : (
              <motion.span
                key="btn-verify"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 inline-flex items-center justify-center gap-2 transform-gpu"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{buttonLabel}</span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* 7. Bottom Row: "← Change email" + ResendTimer */}
      <AnimatePresence initial={false}>
        {!isSuccess && (
          <motion.div
            key="resend-row-wrapper"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 14 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full overflow-hidden"
          >
            <ResendTimer
              secondsRemaining={state.resendSeconds}
              totalSeconds={30}
              resendCount={state.resendCount}
              maxResends={state.maxResends}
              toastMessage={state.toastMessage}
              onResend={() => void triggerResend()}
              onChangeEmail={onChangeEmail}
              visible={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (!fullScreen) {
    return innerContent;
  }

  return (
    <div
      data-testid="otp-fullscreen-page"
      className="relative min-h-screen w-full flex flex-col justify-between items-center px-4 py-8 overflow-x-hidden font-sans selection:bg-[#10b981]/30 selection:text-white"
    >
      <AuthBackground />

      <div className="h-2 shrink-0" aria-hidden="true" />

      <main className="relative z-10 w-full flex items-center justify-center my-auto">
        <GlassCard maxWidthClass="max-w-[520px]" transitionTrigger="otp">
          {innerContent}
        </GlassCard>
      </main>

      <footer className="relative z-10 pt-6 text-center text-[11px] text-white/40 select-none">
        © 2026 {DIGISTORE_CONFIG.siteName}
      </footer>
    </div>
  );
}
