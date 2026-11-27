"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { formatCountdown } from "@/lib/otp-state-machine";

export interface ResendTimerProps {
  secondsRemaining: number;
  totalSeconds?: number;
  resendCount: number;
  maxResends?: number;
  toastMessage: string | null;
  onResend: () => void;
  onChangeEmail?: () => void;
  visible?: boolean;
}

/**
 * ResendTimer (V15 Circular SVG Countdown + Site Dark Cyan Footer Row)
 * - Supports optional "← Change email" on the left (matching the Signup OTP screenshot)
 *   and the V15 14px circular SVG progress ring + "Resend in 0:XX" / clickable "Resend code" on the right.
 */
export function ResendTimer({
  secondsRemaining,
  totalSeconds = 30,
  resendCount,
  maxResends = 3,
  toastMessage,
  onResend,
  onChangeEmail,
  visible = true,
}: ResendTimerProps) {
  const ringSize = 14;
  const strokeWidth = 1.8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, secondsRemaining / totalSeconds));
  const dashOffset = circumference * (1 - fraction);

  const isExhausted = resendCount >= maxResends && secondsRemaining === 0;
  const canResend = secondsRemaining <= 0 && resendCount < maxResends;

  const resendControl = isExhausted ? (
    <span
      data-testid="resend-limit-msg"
      style={{ fontSize: 12.5, color: "#F87171", fontWeight: 500 }}
    >
      Too many attempts, try again later.
    </span>
  ) : (
    <AnimatePresence mode="wait">
      {canResend ? (
        <motion.button
          key="resend-action-btn"
          type="button"
          data-testid="resend-code-button"
          onClick={onResend}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18 }}
          style={{
            color: "#34D399",
            fontWeight: 600,
          }}
          className="inline-flex items-center gap-1.5 cursor-pointer text-[12.5px] transition-colors hover:text-[#6EE7B7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/40 rounded-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Resend code</span>
        </motion.button>
      ) : (
        <motion.div
          key="resend-countdown-display"
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18 }}
          className="inline-flex items-center gap-1.5 text-[12.5px]"
        >
          {/* Small 14px circular ring countdown (SVG stroke that depletes) */}
          <svg
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            className="-rotate-90 shrink-0"
            aria-hidden="true"
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="rgba(148, 163, 184, 0.25)"
              strokeWidth={strokeWidth}
            />
            <motion.circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#10B981"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.4, ease: "linear" }}
            />
          </svg>

          <span
            data-testid="resend-countdown-text"
            style={{
              color: "rgba(255, 255, 255, 0.72)",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
            className="tabular-nums"
          >
            Resend in {formatCountdown(secondsRemaining)}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="resend-timer-row"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4, transition: { duration: 0.2 } }}
          transition={{ duration: 0.25 }}
          className="relative flex w-full flex-col items-center justify-center pt-1"
        >
          {onChangeEmail ? (
            <div className="flex w-full items-center justify-between gap-2 text-[12.5px]">
              <button
                type="button"
                onClick={onChangeEmail}
                className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change email</span>
              </button>

              {resendControl}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-[12.5px]">
              {!isExhausted && (
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.55)",
                    fontWeight: 500,
                  }}
                >
                  Didn&apos;t get a code?
                </span>
              )}
              {resendControl}
            </div>
          )}

          {/* Small "Code sent" toast fade */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                key="code-sent-toast"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "#6EE7B7",
                  backgroundColor: "rgba(16, 185, 129, 0.18)",
                  border: "1px solid rgba(16, 185, 129, 0.38)",
                }}
                className="mt-2 rounded-lg px-2.5 py-0.5 shadow-xs"
              >
                {toastMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
