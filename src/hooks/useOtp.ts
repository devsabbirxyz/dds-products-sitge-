"use client";

import {
  useReducer,
  useRef,
  useState,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import {
  createInitialOtpState,
  otpMachineReducer,
  sanitizeSingleDigit,
  sanitizeOtpSequence,
  getFilledCount,
  isCodeComplete,
  type OtpMachineState,
} from "@/lib/otp-state-machine";
import { verifyOtp, resendOtp } from "@/lib/otp-api";

export interface UseOtpOptions {
  length?: 4 | 6;
  identifier?: string;
  demoMode?: boolean;
  autoPlay?: boolean;
  initialCooldown?: number;
  maxResends?: number;
  onVerify?: (code: string) => Promise<boolean>;
  onResend?: () => Promise<void>;
  onSuccess?: () => void;
}

export interface UseOtpReturn {
  state: OtpMachineState;
  filledCount: number;
  isComplete: boolean;
  isAutoPlaying: boolean;
  inputRefs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  focusBox: (index: number) => void;
  handleDigitInput: (index: number, rawValue: string) => void;
  handleKeyDown: (index: number, e: KeyboardEvent<HTMLInputElement>) => void;
  handlePaste: (e: ClipboardEvent<HTMLInputElement>) => void;
  deleteLastDigit: () => void;
  submitVerification: (explicitCode?: string) => Promise<void>;
  triggerResend: () => Promise<void>;
  resetOtp: () => void;
  stopAutoPlay: () => void;
}

export function useOtp({
  length = 6,
  identifier = "s•••••@gmail.com",
  demoMode = false,
  autoPlay = false,
  initialCooldown = 30,
  maxResends = 3,
  onVerify,
  onResend,
  onSuccess,
}: UseOtpOptions = {}): UseOtpReturn {
  const [state, dispatch] = useReducer(
    otpMachineReducer,
    createInitialOtpState(length, autoPlay ? 17 : initialCooldown, maxResends),
  );

  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(autoPlay);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const activeIndexRef = useRef<number>(0);
  const digitsRef = useRef<string[]>(Array.from({ length }, () => ""));
  const statusRef = useRef<OtpMachineState["status"]>(state.status);
  const shouldAutoSubmitRef = useRef<boolean>(false);
  const verifyTimeoutRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const pasteTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const autoSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVerifyingRef = useRef(false);
  const hasCalledSuccessRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    setIsAutoPlaying(autoPlay);
  }, [autoPlay]);

  useEffect(() => {
    activeIndexRef.current = state.activeIndex;
    digitsRef.current = state.digits;
    statusRef.current = state.status;
  }, [state.activeIndex, state.digits, state.status]);

  const clearScheduledTimeouts = useCallback(() => {
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    for (const t of verifyTimeoutRef.current) clearTimeout(t);
    verifyTimeoutRef.current = [];
    for (const t of pasteTimeoutsRef.current) clearTimeout(t);
    pasteTimeoutsRef.current = [];
  }, []);

  const stopAutoPlay = useCallback(() => {
    setIsAutoPlaying((prev) => {
      if (!prev) return false;
      clearScheduledTimeouts();
      isVerifyingRef.current = false;
      shouldAutoSubmitRef.current = false;
      activeIndexRef.current = 0;
      digitsRef.current = Array.from({ length }, () => "");
      dispatch({ type: "RESET_TO_IDLE" });
      return false;
    });
  }, [clearScheduledTimeouts, length]);

  const focusBox = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(length - 1, index));
      activeIndexRef.current = clamped;
      dispatch({ type: "FOCUS", index: clamped });
      const el = inputRefs.current[clamped];
      if (el && document.activeElement !== el) {
        el.focus();
      }
    },
    [length],
  );

  // Sync any digits typed prior to hydration and focus first empty box on initial mount
  useEffect(() => {
    if (!isAutoPlaying) {
      const rawDomValues = inputRefs.current
        .slice(0, length)
        .map((el) => el?.value || "")
        .join("");
      const preHydratedDigits = sanitizeOtpSequence(rawDomValues, length);
      if (preHydratedDigits.length > 0) {
        const nextDigits = Array.from({ length }, (_, i) => preHydratedDigits[i] || "");
        digitsRef.current = nextDigits;
        dispatch({ type: "PASTE", digits: preHydratedDigits });
        const focusTarget = Math.min(length - 1, preHydratedDigits.length);
        activeIndexRef.current = focusTarget;
        inputRefs.current[focusTarget]?.focus();
        return;
      }

      const t = setTimeout(() => {
        activeIndexRef.current = 0;
        inputRefs.current[0]?.focus();
      }, 25);
      return () => clearTimeout(t);
    }
  }, [isAutoPlaying, length]);

  // 1-second countdown timer for Resend
  useEffect(() => {
    if (state.status === "success" || state.resendSeconds <= 0) return;
    const interval = setInterval(() => {
      dispatch({ type: "TICK_RESEND" });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.status, state.resendSeconds]);

  // Clear "Code sent" toast after 2.2s
  useEffect(() => {
    if (!state.toastMessage) return;
    const t = setTimeout(() => {
      dispatch({ type: "CLEAR_TOAST" });
    }, 2200);
    return () => clearTimeout(t);
  }, [state.toastMessage]);

  // Automatically navigate to dashboard (onSuccess) ~1.15s after entering "success" state
  useEffect(() => {
    if (state.status !== "success") {
      hasCalledSuccessRef.current = false;
      return;
    }
    if (isAutoPlaying || hasCalledSuccessRef.current) return;
    const t = setTimeout(() => {
      if (!hasCalledSuccessRef.current) {
        hasCalledSuccessRef.current = true;
        onSuccessRef.current?.();
      }
    }, 1150);
    return () => clearTimeout(t);
  }, [state.status, isAutoPlaying]);

  const runErrorSequence = useCallback(
    (customMessage?: string) => {
      isVerifyingRef.current = false;
      shouldAutoSubmitRef.current = false;
      dispatch({
        type: "VERIFY_ERROR",
        message: customMessage || "That code didn't match. Try again.",
      });

      // Keep focus on the last filled box so user can immediately press Backspace/Delete to erase wrong digits!
      if (!isAutoPlaying) {
        const lastIdx = length - 1;
        activeIndexRef.current = lastIdx;
        setTimeout(() => {
          inputRefs.current[lastIdx]?.focus();
        }, 15);
      }

      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        try {
          navigator.vibrate(120);
        } catch {
          // ignore vibration permission errors
        }
      }

      // 1. Chromatic RGB slice glitch settles after 200ms into crisp red digits
      const glitchTimer = setTimeout(() => {
        dispatch({ type: "STOP_GLITCH" });
      }, 200);
      verifyTimeoutRef.current.push(glitchTimer);

      // 2. Only auto-cascade and wipe digits when running in automated demo loop (isAutoPlaying).
      // In interactive mode (!isAutoPlaying), keep the wrong digits in the boxes so the user
      // can freely delete/edit them with Backspace or type a new code!
      if (isAutoPlaying) {
        const clearStartTimer = setTimeout(() => {
          activeIndexRef.current = 0;
          dispatch({ type: "START_RESET" });
        }, 1000);

        const resetTimer = setTimeout(() => {
          activeIndexRef.current = 0;
          digitsRef.current = Array.from({ length }, () => "");
          dispatch({ type: "RESET_TO_IDLE" });
          isVerifyingRef.current = false;
        }, 1700);

        verifyTimeoutRef.current.push(clearStartTimer, resetTimer);
      }
    },
    [isAutoPlaying, length],
  );

  const submitVerification = useCallback(
    async (explicitCode?: string) => {
      const code = explicitCode ?? digitsRef.current.join("");
      if (code.length < length || isVerifyingRef.current) return;

      shouldAutoSubmitRef.current = false;
      isVerifyingRef.current = true;
      dispatch({ type: "START_VERIFY" });

      const isDemoValidCode =
        length === 6 ? code === "123456" : code === "1234";

      try {
        if (onVerify && !isAutoPlaying) {
          const startAt = Date.now();
          const ok = await onVerify(code);
          const elapsed = Date.now() - startAt;
          const remainingDelay = Math.max(0, 750 - elapsed);
          if (remainingDelay > 0) {
            await new Promise((r) => setTimeout(r, remainingDelay));
          }
          // Check if user cancelled verification by pressing Backspace while verifying
          if (!isVerifyingRef.current) return;
          if (ok) {
            dispatch({ type: "VERIFY_SUCCESS" });
            isVerifyingRef.current = false;
          } else {
            runErrorSequence("That code didn't match. Try again.");
          }
          return;
        }

        if (!demoMode && !isAutoPlaying) {
          const startAt = Date.now();
          try {
            const res = await verifyOtp({
              identifier,
              code,
              purpose: "verify",
            });
            const elapsed = Date.now() - startAt;
            const remainingDelay = Math.max(0, 750 - elapsed);
            if (remainingDelay > 0) {
              await new Promise((r) => setTimeout(r, remainingDelay));
            }
            if (!isVerifyingRef.current) return;
            if (res.ok && res.verified) {
              dispatch({ type: "VERIFY_SUCCESS" });
              isVerifyingRef.current = false;
            } else {
              runErrorSequence(res.message || "That code didn't match. Try again.");
            }
            return;
          } catch {
            if (!isVerifyingRef.current) return;
            runErrorSequence("That code didn't match. Try again.");
            return;
          }
        }

        const timer = setTimeout(() => {
          if (!isVerifyingRef.current) return;
          if (demoMode && isDemoValidCode) {
            dispatch({ type: "VERIFY_SUCCESS" });
            isVerifyingRef.current = false;
          } else {
            runErrorSequence("That code didn't match. Try again.");
          }
        }, 750);
        verifyTimeoutRef.current.push(timer);
      } catch (err) {
        if (!isVerifyingRef.current) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : "That code didn't match. Try again.";
        runErrorSequence(message);
      }
    },
    [length, onVerify, isAutoPlaying, demoMode, identifier, runErrorSequence],
  );

  // Auto-submit ONLY when the user has just completed the final box or finished pasting all digits
  useEffect(() => {
    if (isAutoPlaying) return;
    if (
      state.status === "typing" &&
      shouldAutoSubmitRef.current &&
      isCodeComplete(state.digits, length) &&
      !isVerifyingRef.current
    ) {
      const t = setTimeout(() => {
        shouldAutoSubmitRef.current = false;
        void submitVerification(state.digits.join(""));
      }, 360);
      autoSubmitTimeoutRef.current = t;
      return () => {
        clearTimeout(t);
        autoSubmitTimeoutRef.current = null;
      };
    }
  }, [state.status, state.digits, length, isAutoPlaying, submitVerification]);

  // Demo Auto-Play Loop
  useEffect(() => {
    if (!isAutoPlaying) return;

    let cancelled = false;
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms);
        timers.push(t);
      });

    async function runLoop() {
      const goodDigits = length === 6 ? ["1", "2", "3", "4", "5", "6"] : ["1", "2", "3", "4"];
      const badDigits = length === 6 ? ["5", "4", "5", "4", "5", "4"] : ["5", "4", "5", "4"];

      while (!cancelled) {
        isVerifyingRef.current = false;
        activeIndexRef.current = 0;
        digitsRef.current = Array.from({ length }, () => "");
        dispatch({ type: "RESET_TO_IDLE" });
        dispatch({ type: "SET_RESEND_SECONDS", seconds: 17 });
        await wait(220);
        if (cancelled) break;

        for (let i = 0; i < goodDigits.length; i++) {
          if (cancelled) break;
          dispatch({ type: "FOCUS", index: i });
          await wait(60);
          if (cancelled) break;
          digitsRef.current[i] = goodDigits[i];
          dispatch({ type: "SET_DIGIT", index: i, digit: goodDigits[i] });
          await wait(190);
        }
        if (cancelled) break;

        await wait(140);
        if (cancelled) break;
        dispatch({ type: "START_VERIFY" });
        await wait(700);
        if (cancelled) break;

        dispatch({ type: "VERIFY_SUCCESS" });
        await wait(1350);
        if (cancelled) break;

        activeIndexRef.current = 0;
        digitsRef.current = Array.from({ length }, () => "");
        dispatch({ type: "RESET_TO_IDLE" });
        dispatch({ type: "SET_RESEND_SECONDS", seconds: 28 });
        await wait(240);
        if (cancelled) break;

        for (let i = 0; i < badDigits.length; i++) {
          if (cancelled) break;
          dispatch({ type: "FOCUS", index: i });
          await wait(60);
          if (cancelled) break;
          digitsRef.current[i] = badDigits[i];
          dispatch({ type: "SET_DIGIT", index: i, digit: badDigits[i] });
          await wait(190);
        }
        if (cancelled) break;

        await wait(140);
        if (cancelled) break;
        dispatch({ type: "START_VERIFY" });
        await wait(650);
        if (cancelled) break;

        dispatch({
          type: "VERIFY_ERROR",
          message: "That code didn't match. Try again.",
        });
        await wait(200);
        if (cancelled) break;
        dispatch({ type: "STOP_GLITCH" });
        await wait(800);
        if (cancelled) break;

        dispatch({ type: "START_RESET" });
        await wait(700);
        if (cancelled) break;

        dispatch({ type: "RESET_TO_IDLE" });
        await wait(250);
      }
    }

    void runLoop();

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
  }, [isAutoPlaying, length]);

  useEffect(() => {
    return () => {
      clearScheduledTimeouts();
    };
  }, [clearScheduledTimeouts]);

  // Helper to animate a pasted sequence box-by-box with the full V15 pop, sparkle, ripple & sliding glow
  const animatePastedDigits = useCallback(
    (pastedDigits: string[], startIndex = 0) => {
      if (pastedDigits.length === 0) return;
      clearScheduledTimeouts();
      isVerifyingRef.current = false;
      shouldAutoSubmitRef.current = false;

      // Clear boxes from startIndex onward first so each pasted digit visibly pops & rolls in
      const initialDigits = [...digitsRef.current];
      for (let i = startIndex; i < length; i++) {
        initialDigits[i] = "";
      }
      digitsRef.current = initialDigits;
      dispatch({ type: "RESET_TO_IDLE" });

      pastedDigits.forEach((digit, offset) => {
        const targetIdx = startIndex + offset;
        if (targetIdx >= length) return;

        const t = setTimeout(() => {
          dispatch({ type: "FOCUS", index: targetIdx });
          const nextDigits = [...digitsRef.current];
          nextDigits[targetIdx] = digit;
          digitsRef.current = nextDigits;

          if (targetIdx === length - 1 && isCodeComplete(nextDigits, length)) {
            shouldAutoSubmitRef.current = true;
          }

          dispatch({ type: "SET_DIGIT", index: targetIdx, digit });

          const focusIdx = Math.min(length - 1, targetIdx + 1);
          activeIndexRef.current = focusIdx;
          inputRefs.current[focusIdx]?.focus();
        }, offset * 65);

        pasteTimeoutsRef.current.push(t);
      });
    },
    [clearScheduledTimeouts, length],
  );

  // Perform a single backspace/delete action from the rightmost filled or currently active box
  const performBackspaceAt = useCallback(
    (targetIndex?: number) => {
      if (state.status === "success") return;
      if (isAutoPlaying) {
        stopAutoPlay();
      }
      // Cancel any pending verify / error / reset timers immediately so user can edit freely!
      clearScheduledTimeouts();
      isVerifyingRef.current = false;
      shouldAutoSubmitRef.current = false;

      const currentDigits = [...digitsRef.current];
      let idx =
        typeof targetIndex === "number"
          ? Math.max(0, Math.min(length - 1, targetIndex))
          : activeIndexRef.current;

      if (currentDigits[idx] !== "") {
        currentDigits[idx] = "";
        digitsRef.current = currentDigits;
        activeIndexRef.current = idx;
        dispatch({ type: "BACKSPACE", index: idx });
        inputRefs.current[idx]?.focus();
      } else if (idx > 0 && currentDigits[idx - 1] !== "") {
        const prevIdx = idx - 1;
        currentDigits[prevIdx] = "";
        digitsRef.current = currentDigits;
        activeIndexRef.current = prevIdx;
        dispatch({ type: "BACKSPACE", index: idx });
        inputRefs.current[prevIdx]?.focus();
      } else {
        // Fallback: find the rightmost non-empty box and delete it
        for (let i = length - 1; i >= 0; i--) {
          if (currentDigits[i] !== "") {
            currentDigits[i] = "";
            digitsRef.current = currentDigits;
            activeIndexRef.current = i;
            dispatch({ type: "BACKSPACE", index: i });
            inputRefs.current[i]?.focus();
            break;
          }
        }
      }
    },
    [state.status, isAutoPlaying, stopAutoPlay, clearScheduledTimeouts, length],
  );

  const deleteLastDigit = useCallback(() => {
    performBackspaceAt();
  }, [performBackspaceAt]);

  const handleDigitInput = useCallback(
    (index: number, rawValue: string) => {
      if (isAutoPlaying) {
        stopAutoPlay();
      }
      if (state.status === "success") {
        return;
      }

      // Cancel any pending error/reset/verify timeouts when user types or edits
      clearScheduledTimeouts();
      isVerifyingRef.current = false;

      let targetIndex = Math.max(0, Math.min(length - 1, index));

      // Case 1: User cleared/deleted the input (e.g. mobile soft-keyboard Backspace or Cut)
      if (!rawValue || rawValue.trim() === "") {
        shouldAutoSubmitRef.current = false;
        const nextDigits = [...digitsRef.current];
        nextDigits[targetIndex] = "";
        digitsRef.current = nextDigits;
        const prevFocus = Math.max(0, targetIndex - 1);
        activeIndexRef.current = targetIndex;
        dispatch({ type: "BACKSPACE", index: targetIndex });
        if (nextDigits[targetIndex] === "" && targetIndex > 0) {
          inputRefs.current[prevFocus]?.focus();
        }
        return;
      }

      const seq = sanitizeOtpSequence(rawValue, length);
      if (seq.length === 0) return;

      const existingDigit = digitsRef.current[targetIndex] || "";

      // Case 2: User pasted or autofilled multiple digits (3+ digits, or 2+ digits into an empty box)
      if (seq.length >= 3 || (seq.length === 2 && !existingDigit)) {
        animatePastedDigits(seq, 0);
        return;
      }

      // Case 3: User typed a single digit into an empty or already-filled box
      let cleanDigit = seq[seq.length - 1];
      if (existingDigit && seq.length === 2) {
        cleanDigit = seq[0] === existingDigit ? seq[1] : seq[0];
      }

      if (!cleanDigit) return;

      // If all boxes were filled in error state and user starts typing a new code, reset and start from box 0!
      if (
        statusRef.current === "error" &&
        isCodeComplete(digitsRef.current, length) &&
        targetIndex === length - 1
      ) {
        const freshDigits = Array.from({ length }, () => "");
        freshDigits[0] = cleanDigit;
        digitsRef.current = freshDigits;
        shouldAutoSubmitRef.current = false;
        dispatch({ type: "RESET_TO_IDLE" });
        dispatch({ type: "SET_DIGIT", index: 0, digit: cleanDigit });
        activeIndexRef.current = 1;
        inputRefs.current[1]?.focus();
        return;
      }

      const nextDigits = [...digitsRef.current];
      nextDigits[targetIndex] = cleanDigit;
      digitsRef.current = nextDigits;

      // Only auto-submit when user types into the final box and all boxes are now complete
      shouldAutoSubmitRef.current =
        targetIndex === length - 1 && isCodeComplete(nextDigits, length);

      const nextFocus = Math.min(length - 1, targetIndex + 1);
      activeIndexRef.current = nextFocus;

      dispatch({ type: "SET_DIGIT", index: targetIndex, digit: cleanDigit });
      if (targetIndex < length - 1) {
        inputRefs.current[nextFocus]?.focus();
      }
    },
    [
      isAutoPlaying,
      stopAutoPlay,
      state.status,
      clearScheduledTimeouts,
      length,
      animatePastedDigits,
    ],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (isAutoPlaying) {
        stopAutoPlay();
      }
      if (state.status === "success") {
        return;
      }

      const currentIdx = Math.max(0, Math.min(length - 1, index));

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        performBackspaceAt(currentIdx);
      } else if (e.key === "ArrowLeft" && currentIdx > 0) {
        e.preventDefault();
        focusBox(currentIdx - 1);
      } else if (e.key === "ArrowRight" && currentIdx < length - 1) {
        e.preventDefault();
        focusBox(currentIdx + 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (isCodeComplete(digitsRef.current, length)) {
          void submitVerification(digitsRef.current.join(""));
        }
      } else if (/^[0-9০-৯]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleDigitInput(currentIdx, e.key);
      }
    },
    [
      isAutoPlaying,
      stopAutoPlay,
      state.status,
      length,
      performBackspaceAt,
      focusBox,
      submitVerification,
      handleDigitInput,
    ],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (isAutoPlaying) {
        stopAutoPlay();
      }
      if (state.status === "success") {
        return;
      }
      const rawText = e.clipboardData.getData("text") || "";
      const pastedDigits = sanitizeOtpSequence(rawText, length);
      if (pastedDigits.length === 0) return;

      animatePastedDigits(pastedDigits, 0);
    },
    [isAutoPlaying, stopAutoPlay, state.status, length, animatePastedDigits],
  );

  const triggerResend = useCallback(async () => {
    if (state.resendSeconds > 0 || state.resendCount >= state.maxResends) {
      return;
    }
    clearScheduledTimeouts();
    if (onResend) {
      await onResend();
    } else if (!demoMode) {
      await resendOtp({
        identifier,
        length,
        purpose: "verify",
      });
    }
    isVerifyingRef.current = false;
    activeIndexRef.current = 0;
    digitsRef.current = Array.from({ length }, () => "");
    dispatch({ type: "RESEND_SUCCESS", cooldownSeconds: 30 });
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 20);
  }, [
    state.resendSeconds,
    state.resendCount,
    state.maxResends,
    clearScheduledTimeouts,
    onResend,
    demoMode,
    identifier,
    length,
  ]);

  const resetOtp = useCallback(() => {
    clearScheduledTimeouts();
    isVerifyingRef.current = false;
    activeIndexRef.current = 0;
    digitsRef.current = Array.from({ length }, () => "");
    dispatch({ type: "RESET_TO_IDLE" });
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 20);
  }, [clearScheduledTimeouts, length]);

  // Global keyboard & paste listeners so typing, Backspace/Delete, and Ctrl+V work even when no input is focused
  useEffect(() => {
    const onWindowKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const activeEl = document.activeElement;
      const isOurInput = inputRefs.current.some((el) => el === activeEl);
      if (
        activeEl &&
        !isOurInput &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (state.status === "success") return;

      if (/^[0-9০-৯]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isAutoPlaying) {
          stopAutoPlay();
        }
        e.preventDefault();
        handleDigitInput(activeIndexRef.current, e.key);
      } else if ((e.key === "Backspace" || e.key === "Delete") && !isAutoPlaying) {
        e.preventDefault();
        performBackspaceAt();
      }
    };

    const onWindowPaste = (e: globalThis.ClipboardEvent) => {
      if (e.defaultPrevented) return;
      const activeEl = document.activeElement;
      const isOurInput = inputRefs.current.some((el) => el === activeEl);
      if (
        activeEl &&
        !isOurInput &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }
      if (state.status === "success") return;
      const rawText = e.clipboardData?.getData("text") || "";
      const pastedDigits = sanitizeOtpSequence(rawText, length);
      if (pastedDigits.length === 0) return;
      e.preventDefault();
      if (isAutoPlaying) {
        stopAutoPlay();
      }
      animatePastedDigits(pastedDigits, 0);
    };

    window.addEventListener("keydown", onWindowKeyDown);
    window.addEventListener("paste", onWindowPaste);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
      window.removeEventListener("paste", onWindowPaste);
    };
  }, [
    isAutoPlaying,
    stopAutoPlay,
    state.status,
    length,
    handleDigitInput,
    performBackspaceAt,
    animatePastedDigits,
  ]);

  const filledCount = getFilledCount(state.digits);
  const isComplete = isCodeComplete(state.digits, length);

  return {
    state,
    filledCount,
    isComplete,
    isAutoPlaying,
    inputRefs,
    focusBox,
    handleDigitInput,
    handleKeyDown,
    handlePaste,
    deleteLastDigit,
    submitVerification,
    triggerResend,
    resetOtp,
    stopAutoPlay,
  };
}
