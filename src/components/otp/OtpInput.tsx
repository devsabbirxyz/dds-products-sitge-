"use client";

import React, { useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { OtpMachineStatus } from "@/lib/otp-state-machine";

export interface OtpInputProps {
  digits: string[];
  entrySeq?: number[];
  activeIndex: number;
  status: OtpMachineStatus;
  isGlitching: boolean;
  isClearingError: boolean;
  inputRefs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  onFocusBox: (index: number) => void;
  onDigitInput: (index: number, value: string) => void;
  onKeyDown: (index: number, e: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const SPARKLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * SlotDigitDisplay
 * Pure GPU transform + opacity spring (no per-frame filter:blur rasterization or DOM-swapping timers)
 * for silky 60fps digit entry and paste waves.
 */
function SlotDigitDisplay({
  digit,
  boxIndex,
  seq,
  color,
  isSuccess,
  prefersReducedMotion,
}: {
  digit: string;
  boxIndex: number;
  seq: number;
  color: string;
  isSuccess: boolean;
  prefersReducedMotion: boolean | null;
}) {
  return (
    <div
      style={{ height: 26 }}
      className="relative flex items-center justify-center overflow-hidden"
    >
      <motion.span
        key={`settled-${seq}-${digit}`}
        initial={
          prefersReducedMotion
            ? { opacity: 0 }
            : { y: 10, scale: 0.78, opacity: 0 }
        }
        animate={{
          y: 0,
          scale: 1,
          opacity: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 310,
          damping: 25,
          mass: 0.58,
        }}
        style={{
          fontSize: 22,
          fontWeight: 700,
          lineHeight: "26px",
          color,
          transition: isSuccess
            ? `color 0.22s ease ${boxIndex * 75}ms`
            : "color 0.16s ease",
        }}
        className="block transform-gpu will-change-transform"
      >
        {digit}
      </motion.span>
    </div>
  );
}

/**
 * OtpInput (6-Box Obsidian Dark & Emerald-Teal-Cyan Glass Row + Silky 60fps Micro-Interactions)
 */
export function OtpInput({
  digits,
  entrySeq = [],
  activeIndex,
  status,
  isGlitching,
  isClearingError,
  inputRefs,
  onFocusBox,
  onDigitInput,
  onKeyDown,
  onPaste,
  disabled = false,
}: OtpInputProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isInputFocused, setIsInputFocused] = useState(true);

  const length = digits.length;
  const isSuccess = status === "success";
  const isError = status === "error";
  const isReset = status === "reset" || isClearingError;
  const isVerifying = status === "verifying";
  const canEdit = !disabled && !isSuccess;

  return (
    <motion.div
      role="group"
      aria-label={`${length}-digit verification code`}
      data-testid="otp-box-row"
      animate={
        isError && !isReset && !prefersReducedMotion
          ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
          : { x: 0 }
      }
      transition={
        isError && !isReset
          ? { duration: 0.42, ease: [0.36, 0.07, 0.19, 0.97] }
          : { duration: 0.2, ease: "easeOut" }
      }
      className="flex items-center justify-center gap-2 sm:gap-2.5 transform-gpu"
    >
      {digits.map((digit, idx) => {
        const seq = entrySeq[idx] ?? 0;
        const isFilled = digit !== "";
        const isActive =
          (!isSuccess && isInputFocused && activeIndex === idx) ||
          (isReset && idx === 0);

        const isFirstPair = idx < Math.ceil(length / 2);
        const isLastBox = idx === length - 1;

        // Determine box background & border styling in site's Obsidian Dark & Emerald-Teal-Cyan palette
        let boxBackground = "rgba(17, 24, 39, 0.72)";
        let boxBorderColor = "rgba(148, 163, 184, 0.24)";

        if (isSuccess) {
          boxBackground =
            "linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)";
          boxBorderColor = "transparent";
        } else if (isError && !isReset) {
          boxBackground = "rgba(127, 29, 29, 0.42)";
          boxBorderColor = "#F87171";
        } else if (isActive) {
          boxBackground = "rgba(6, 48, 43, 0.78)";
          boxBorderColor = "#10B981";
        } else if (isFilled && !isReset) {
          boxBackground =
            "linear-gradient(180deg, rgba(13, 38, 38, 0.92), rgba(9, 22, 28, 0.92)) padding-box, linear-gradient(135deg, #34D399 0%, #10B981 50%, #06B6D4 100%) border-box";
          boxBorderColor = "transparent";
        }

        const digitColor = isSuccess
          ? "#FFFFFF"
          : isError || isReset
            ? "#FCA5A5"
            : "#FFFFFF";

        return (
          <motion.div
            key={idx}
            data-testid={`otp-box-${idx}`}
            onClick={() => {
              if (canEdit) {
                setIsInputFocused(true);
                onFocusBox(idx);
                inputRefs.current[idx]?.focus();
              }
            }}
            animate={
              prefersReducedMotion
                ? { scale: 1, y: 0, x: 0, rotate: 0 }
                : isSuccess
                  ? {
                      scale: [1, 1.06, 1],
                      y: [0, -6, 0],
                      x: 0,
                      rotate: 0,
                    }
                  : isVerifying
                    ? {
                        y: [0, -4, 0],
                        scale: 1,
                        x: 0,
                        rotate: 0,
                      }
                    : isError && !isReset
                      ? {
                          x: isFirstPair ? [0, 5, -3, 1.5, 0] : [0, -5, 3, -1.5, 0],
                          rotate: isLastBox ? [0, 2.5, -2.5, 1, 0] : 0,
                          scale: 1,
                          y: 0,
                        }
                      : isActive
                        ? {
                            scale: 1.04,
                            y: -1.5,
                            x: 0,
                            rotate: 0,
                          }
                        : {
                            scale: 1,
                            y: 0,
                            x: 0,
                            rotate: 0,
                          }
            }
            transition={
              isSuccess
                ? {
                    delay: idx * 0.075,
                    duration: 0.38,
                    ease: [0.22, 1, 0.36, 1],
                  }
                : isVerifying
                  ? {
                      delay: idx * 0.1,
                      duration: 0.62,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
                  : isError && !isReset
                    ? {
                        duration: 0.34,
                        ease: [0.22, 1, 0.36, 1],
                      }
                    : {
                        type: "spring",
                        stiffness: 320,
                        damping: 26,
                        mass: 0.6,
                      }
            }
            style={{
              borderRadius: 14,
              background: boxBackground,
              border: isSuccess ? "none" : `1.5px solid ${boxBorderColor}`,
              boxShadow: isSuccess
                ? "0 6px 18px rgba(16, 185, 129, 0.42)"
                : isError && !isReset
                  ? "0 4px 14px rgba(239, 68, 68, 0.25)"
                  : isFilled && !isReset
                    ? "0 4px 14px rgba(16, 185, 129, 0.18)"
                    : "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
              transition: isSuccess
                ? `background 0.24s ease ${idx * 75}ms, box-shadow 0.24s ease ${idx * 75}ms`
                : "background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
            }}
            className={`relative flex flex-col items-center justify-center cursor-text transform-gpu will-change-transform ${
              length === 6
                ? "w-[46px] h-[52px] sm:w-[52px] sm:h-[56px]"
                : "w-[52px] h-[56px]"
            }`}
          >
            {/* 1. Shared Sliding Glow Ring on Active Focused Box (layoutId glides smoothly between boxes) */}
            {isActive && (
              <motion.div
                layoutId="otp-active-glow-ring"
                transition={{
                  type: "spring",
                  stiffness: 310,
                  damping: 28,
                  mass: 0.55,
                }}
                style={{
                  borderRadius: 14,
                  boxShadow: isError
                    ? "0 0 0 3.5px rgba(248, 113, 113, 0.24)"
                    : "0 0 0 3.5px rgba(16, 185, 129, 0.22)",
                }}
                className="pointer-events-none absolute -inset-[1.5px] z-0 transform-gpu"
              />
            )}

            {/* 2. Emerald-Cyan Outline Ripple on Digit Landing */}
            <AnimatePresence>
              {seq > 0 && isFilled && !isSuccess && !isError && !isReset && !prefersReducedMotion && (
                <motion.div
                  key={`ripple-${idx}-${seq}`}
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.15, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    borderRadius: 14,
                    border: "1.5px solid rgba(52, 211, 153, 0.52)",
                  }}
                  className="pointer-events-none absolute inset-0 z-0 transform-gpu"
                />
              )}
            </AnimatePresence>

            {/* 3. Sparkle Ring Layer on Digit Landing */}
            <AnimatePresence>
              {seq > 0 && isFilled && !isSuccess && !isError && !isReset && !prefersReducedMotion && (
                <motion.div
                  key={`sparkle-${idx}-${seq}`}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                  className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                >
                  {SPARKLE_ANGLES.map((deg, sIdx) => {
                    const rad = (deg * Math.PI) / 180;
                    const startR = 25;
                    const endR = 31;
                    const startX = Math.cos(rad) * startR;
                    const startY = Math.sin(rad) * startR;
                    const endX = Math.cos(rad) * endR;
                    const endY = Math.sin(rad) * endR;
                    return (
                      <motion.span
                        key={deg}
                        initial={{ x: startX, y: startY, scale: 0.85, opacity: 0.9 }}
                        animate={{ x: endX, y: endY, scale: 0.2, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          width: 2.5,
                          height: 2.5,
                          borderRadius: 999,
                          backgroundColor: sIdx % 2 === 0 ? "#34D399" : "#22D3EE",
                        }}
                        className="absolute block transform-gpu"
                      />
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 4. Chromatic RGB Slice Glitch Overlay (First 180ms of Error State) */}
            <AnimatePresence>
              {isError && isGlitching && !prefersReducedMotion && isFilled && (
                <motion.div
                  key={`rgb-glitch-${idx}`}
                  aria-hidden="true"
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: [0.9, 0.65, 0.85, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: "linear" }}
                  className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[14px]"
                >
                  <div
                    style={{
                      clipPath: "inset(10% 0 62% 0)",
                      transform: "translateX(-2.5px)",
                      backgroundColor: "rgba(239, 68, 68, 0.25)",
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#EF4444",
                        transform: "translateY(-4px)",
                      }}
                    >
                      {digit}
                    </span>
                  </div>

                  <div
                    style={{
                      clipPath: "inset(38% 0 34% 0)",
                      transform: "translateX(2.5px)",
                      backgroundColor: "rgba(16, 185, 129, 0.25)",
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#34D399",
                        transform: "translateY(-4px)",
                      }}
                    >
                      {digit}
                    </span>
                  </div>

                  <div
                    style={{
                      clipPath: "inset(66% 0 8% 0)",
                      transform: "translateX(2px)",
                      backgroundColor: "rgba(239, 68, 68, 0.22)",
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#EF4444",
                        transform: "translateY(-4px)",
                      }}
                    >
                      {digit}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 5. Native Accessible Input */}
            <input
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus={idx === 0}
              autoComplete={idx === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${idx + 1} of ${length}`}
              disabled={!canEdit}
              value={digit}
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) {
                  setIsInputFocused(true);
                  onFocusBox(idx);
                  e.currentTarget.focus();
                }
              }}
              onFocus={() => {
                setIsInputFocused(true);
                onFocusBox(idx);
              }}
              onChange={(e) => onDigitInput(idx, e.target.value)}
              onKeyDown={(e) => onKeyDown(idx, e)}
              onPaste={onPaste}
              className="absolute inset-0 z-20 h-full w-full cursor-text bg-transparent text-center text-transparent caret-transparent outline-none border-none selection:bg-transparent"
            />

            {/* 6. Visual Content Inside Box (mode="sync" + absolute layers = zero DOM layout thrashing on type/delete) */}
            <div className="pointer-events-none select-none relative z-10 flex h-full w-full items-center justify-center overflow-hidden">
              <AnimatePresence mode="sync" initial={false}>
                {isFilled && !isReset ? (
                  <motion.div
                    key={`digit-active-${idx}-${digit}`}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : {
                            y: -8,
                            opacity: 0,
                            scale: 0.82,
                            transition: {
                              duration: 0.14,
                              ease: [0.22, 1, 0.36, 1],
                            },
                          }
                    }
                    className="absolute inset-0 flex flex-col items-center justify-center transform-gpu"
                  >
                    <SlotDigitDisplay
                      digit={digit}
                      boxIndex={idx}
                      seq={seq}
                      color={digitColor}
                      isSuccess={isSuccess}
                      prefersReducedMotion={prefersReducedMotion}
                    />

                    {/* 14px x 2px Emerald-Cyan Underline centered under digit */}
                    <AnimatePresence>
                      {!isSuccess && (
                        <motion.span
                          key={`underline-${idx}`}
                          initial={{ scaleX: 0, opacity: 0 }}
                          animate={{ scaleX: 1, opacity: 1 }}
                          exit={{ scaleX: 0, opacity: 0 }}
                          transition={{
                            duration: 0.18,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{
                            width: 14,
                            height: 2,
                            borderRadius: 999,
                            marginTop: 5,
                            backgroundColor: isError ? "#EF4444" : "#34D399",
                            transformOrigin: "center",
                          }}
                          className="block transform-gpu"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : isFilled && isReset ? (
                  <div
                    key={`digit-reset-cascade-${idx}`}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <motion.span
                      initial={{ y: 0, opacity: 1 }}
                      animate={{
                        y: prefersReducedMotion ? 0 : 12,
                        opacity: 0,
                      }}
                      transition={{
                        duration: 0.28,
                        delay: prefersReducedMotion ? 0 : idx * 0.11,
                        ease: "easeIn",
                      }}
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        lineHeight: "26px",
                        color: "#FCA5A5",
                      }}
                      className="block transform-gpu"
                    >
                      {digit}
                    </motion.span>

                    <motion.span
                      initial={{ scaleX: 1, opacity: 0.8 }}
                      animate={{ scaleX: 0, opacity: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: prefersReducedMotion ? 0 : idx * 0.11,
                      }}
                      style={{
                        width: 14,
                        height: 2,
                        borderRadius: 999,
                        marginTop: 5,
                        backgroundColor: "#EF4444",
                      }}
                      className="block transform-gpu"
                    />
                  </div>
                ) : isActive && !isFilled ? (
                  <motion.span
                    key={`caret-${idx}`}
                    initial={{ opacity: 0, scaleY: 0.75 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.75 }}
                    transition={{ duration: 0.14, ease: "easeOut" }}
                    style={{
                      width: 2,
                      height: 22,
                      backgroundColor: "#34D399",
                      borderRadius: 1,
                    }}
                    className="animate-otp-caret block transform-gpu"
                  />
                ) : (
                  <motion.span
                    key={`dot-${idx}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.14, ease: "easeOut" }}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 999,
                      backgroundColor: "rgba(148, 163, 184, 0.35)",
                    }}
                    className="block transform-gpu"
                    aria-hidden="true"
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
