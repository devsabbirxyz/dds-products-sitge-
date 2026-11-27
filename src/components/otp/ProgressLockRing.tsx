"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MailCheck, Lock } from "lucide-react";
import type { OtpMachineStatus } from "@/lib/otp-state-machine";

export interface ProgressLockRingProps {
  status: OtpMachineStatus;
  filledCount: number;
  totalLength?: number;
  iconVariant?: "mail" | "lock";
}

/**
 * ProgressLockRing (OTP Animation V15 + Site Emerald-Cyan Glass Palette)
 * Uses pure GPU-composited SVG rotation and strokeDashoffset without per-frame CSS filter rasterization.
 */
export function ProgressLockRing({
  status,
  filledCount,
  totalLength = 6,
  iconVariant = "mail",
}: ProgressLockRingProps) {
  const prefersReducedMotion = useReducedMotion();

  const size = 72;
  const strokeWidth = 2.5;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  const isSuccess = status === "success";
  const isError = status === "error";
  const isVerifying = status === "verifying";
  const isReset = status === "reset";

  let fraction = 0.25;
  if (isSuccess) {
    fraction = 1.0;
  } else if (isVerifying) {
    fraction = 0.32;
  } else if (isError) {
    fraction = 0.85;
  } else if (isReset) {
    fraction = 0.25;
  } else {
    const ratio = Math.max(
      0,
      Math.min(1, filledCount / Math.max(1, totalLength)),
    );
    fraction = 0.25 + ratio * 0.6;
  }

  const dashOffset = circumference * (1 - fraction);

  const ringStroke = isSuccess
    ? "url(#otpRingGreenGrad)"
    : isError
      ? "url(#otpRingErrorGrad)"
      : "url(#otpRingCyanGrad)";

  const IconComponent = iconVariant === "lock" ? Lock : MailCheck;

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: 72, height: 72 }}
      data-testid="progress-lock-ring"
      data-status={status}
    >
      {/* Static Ambient Glow Layer (avoids per-frame drop-shadow rasterization on rotating SVG) */}
      <div
        aria-hidden="true"
        style={{
          width: 68,
          height: 68,
          background: isError
            ? "radial-gradient(circle, rgba(239, 68, 68, 0.22) 0%, transparent 72%)"
            : isSuccess
              ? "radial-gradient(circle, rgba(34, 197, 94, 0.26) 0%, transparent 72%)"
              : "radial-gradient(circle, rgba(16, 185, 129, 0.20) 0%, transparent 72%)",
          transition: "background 0.25s ease",
        }}
        className="pointer-events-none absolute rounded-full"
      />

      {/* Expanding Halo Ring on Success */}
      <AnimatePresence>
        {isSuccess && !prefersReducedMotion && (
          <motion.div
            key="success-halo-ring"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.38, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute rounded-full transform-gpu"
            style={{
              width: 68,
              height: 68,
              border: "2px solid rgba(52, 211, 153, 0.45)",
            }}
          />
        )}
      </AnimatePresence>

      {/* 72px SVG Progress Ring */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform:
            prefersReducedMotion || isSuccess || isError
              ? "rotate(-90deg)"
              : undefined,
        }}
        className={`pointer-events-none absolute inset-0 transform-gpu ${
          prefersReducedMotion || isSuccess || isError
            ? ""
            : isVerifying
              ? "animate-otp-ring-fast"
              : "animate-otp-ring-idle"
        }`}
      >
        <defs>
          <linearGradient id="otpRingCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="otpRingGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
          <linearGradient id="otpRingErrorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
        </defs>

        {/* Faint subtle track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={
            isError
              ? "rgba(239, 68, 68, 0.22)"
              : isSuccess
                ? "rgba(34, 197, 94, 0.25)"
                : "rgba(16, 185, 129, 0.18)"
          }
          strokeWidth={strokeWidth}
        />

        {/* Animated Foreground Arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringStroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{
            duration: 0.34,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </svg>

      {/* 56px Center Icon / Check Badge */}
      <motion.div
        animate={{
          scale: prefersReducedMotion
            ? 1
            : isSuccess
              ? [1, 1.06, 1]
              : isError
                ? [1, 1.03, 0.98, 1]
                : 1,
        }}
        transition={{
          duration: 0.36,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          width: 56,
          height: 56,
          background: isSuccess
            ? "linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)"
            : isError
              ? "rgba(239, 68, 68, 0.18)"
              : "linear-gradient(180deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 182, 212, 0.14) 100%)",
          border: isSuccess
            ? "none"
            : isError
              ? "1px solid rgba(248, 113, 113, 0.45)"
              : "1px solid rgba(16, 185, 129, 0.40)",
          boxShadow: isSuccess
            ? "0 10px 26px rgba(16, 185, 129, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.35)"
            : isError
              ? "0 6px 18px rgba(239, 68, 68, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)"
              : "0 8px 24px rgba(16, 185, 129, 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.20)",
          transition:
            "background 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
        }}
        className="relative z-10 flex items-center justify-center rounded-full transform-gpu"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isSuccess ? (
            <motion.svg
              key="check-icon"
              width={26}
              height={26}
              viewBox="0 0 24 24"
              fill="none"
              initial={{ scale: 0.72, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.72, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
            >
              <motion.path
                d="M5 13l4 4L19 7"
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.svg>
          ) : (
            <motion.div
              key="badge-icon"
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate:
                  isError && !prefersReducedMotion ? [0, -6, 6, -3, 3, 0] : 0,
              }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center"
            >
              <IconComponent
                size={23}
                strokeWidth={1.9}
                style={{
                  color: isError ? "#F87171" : "#34D399",
                  transition: "color 0.2s ease",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
