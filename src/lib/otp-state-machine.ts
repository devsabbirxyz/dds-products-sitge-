export type OtpMachineStatus =
  | "idle"
  | "typing"
  | "verifying"
  | "success"
  | "error"
  | "reset";

export interface OtpMachineState {
  length: 4 | 6;
  digits: string[];
  entrySeq: number[];
  activeIndex: number;
  status: OtpMachineStatus;
  errorMessage: string | null;
  resendSeconds: number;
  resendCount: number;
  maxResends: number;
  isClearingError: boolean;
  isGlitching: boolean;
  toastMessage: string | null;
}

export type OtpMachineAction =
  | { type: "SET_DIGIT"; index: number; digit: string }
  | { type: "BACKSPACE"; index: number }
  | { type: "FOCUS"; index: number }
  | { type: "PASTE"; digits: string[] }
  | { type: "START_VERIFY" }
  | { type: "VERIFY_SUCCESS" }
  | { type: "VERIFY_ERROR"; message?: string }
  | { type: "STOP_GLITCH" }
  | { type: "START_ERROR_CLEAR" }
  | { type: "START_RESET" }
  | { type: "RESET_TO_IDLE" }
  | { type: "TICK_RESEND" }
  | { type: "SET_RESEND_SECONDS"; seconds: number }
  | { type: "RESEND_SUCCESS"; cooldownSeconds?: number }
  | { type: "CLEAR_TOAST" };

export function createInitialOtpState(
  length: 4 | 6 = 6,
  initialCooldown = 30,
  maxResends = 3,
): OtpMachineState {
  return {
    length,
    digits: Array.from({ length }, () => ""),
    entrySeq: Array.from({ length }, () => 0),
    activeIndex: 0,
    status: "idle",
    errorMessage: null,
    resendSeconds: initialCooldown,
    resendCount: 0,
    maxResends,
    isClearingError: false,
    isGlitching: false,
    toastMessage: null,
  };
}

export function sanitizeSingleDigit(raw: string): string {
  const banglaMap: Record<string, string> = {
    "০": "0",
    "১": "1",
    "২": "2",
    "৩": "3",
    "৪": "4",
    "৫": "5",
    "৬": "6",
    "৭": "7",
    "৮": "8",
    "৯": "9",
  };
  const converted = String(raw || "")
    .split("")
    .map((ch) => banglaMap[ch] ?? ch)
    .join("");
  const cleaned = converted.replace(/[^0-9]/g, "");
  return cleaned.slice(-1);
}

export function sanitizeOtpSequence(raw: string, maxLength: number): string[] {
  const banglaMap: Record<string, string> = {
    "০": "0",
    "১": "1",
    "২": "2",
    "৩": "3",
    "৪": "4",
    "৫": "5",
    "৬": "6",
    "৭": "7",
    "৮": "8",
    "৯": "9",
  };
  const converted = String(raw || "")
    .split("")
    .map((ch) => banglaMap[ch] ?? ch)
    .join("");
  return converted
    .replace(/[^0-9]/g, "")
    .slice(0, maxLength)
    .split("");
}

export function maskIdentifier(identifier: string): string {
  const clean = (identifier || "").trim();
  if (!clean) return "s•••••@gmail.com";

  // Already masked
  if (clean.includes("•")) return clean;

  // Email masking: "sabbir@gmail.com" -> "s•••••@gmail.com"
  if (clean.includes("@")) {
    const [local, domain] = clean.split("@");
    if (!local || !domain) return clean;
    const firstChar = local[0];
    const dotCount = Math.max(4, Math.min(6, local.length - 1 || 5));
    return `${firstChar}${"•".repeat(dotCount)}@${domain}`;
  }

  // Phone masking: "+8801712345890" -> "+880 17•• •••890"
  const digitsOnly = clean.replace(/\s+/g, "");
  if (digitsOnly.length >= 8) {
    const prefix = digitsOnly.slice(0, 6);
    const suffix = digitsOnly.slice(-3);
    return `${prefix}•••${suffix}`;
  }

  return clean;
}

export function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getFilledCount(digits: string[]): number {
  return digits.filter((d) => d !== "").length;
}

export function isCodeComplete(digits: string[], length: number): boolean {
  return digits.length === length && digits.every((d) => /^[0-9]$/.test(d));
}

export function otpMachineReducer(
  state: OtpMachineState,
  action: OtpMachineAction,
): OtpMachineState {
  switch (action.type) {
    case "SET_DIGIT": {
      if (state.status === "success") {
        return state;
      }
      const cleanDigit = sanitizeSingleDigit(action.digit);
      if (!cleanDigit) return state;

      const idx = Math.max(0, Math.min(state.length - 1, action.index));
      const nextDigits = [...state.digits];
      nextDigits[idx] = cleanDigit;

      const nextEntrySeq = [...state.entrySeq];
      nextEntrySeq[idx] = (nextEntrySeq[idx] ?? 0) + 1;

      const nextFocus = idx < state.length - 1 ? idx + 1 : idx;
      const filled = getFilledCount(nextDigits);

      return {
        ...state,
        digits: nextDigits,
        entrySeq: nextEntrySeq,
        activeIndex: nextFocus,
        status: filled > 0 ? "typing" : "idle",
        errorMessage: null,
        isClearingError: false,
        isGlitching: false,
      };
    }

    case "BACKSPACE": {
      if (state.status === "success") {
        return state;
      }
      const idx = Math.max(0, Math.min(state.length - 1, action.index));
      const nextDigits = [...state.digits];
      let nextFocus = idx;

      if (nextDigits[idx] !== "") {
        nextDigits[idx] = "";
        nextFocus = idx;
      } else if (idx > 0) {
        nextDigits[idx - 1] = "";
        nextFocus = idx - 1;
      }

      const filled = getFilledCount(nextDigits);
      return {
        ...state,
        digits: nextDigits,
        activeIndex: nextFocus,
        status: filled > 0 ? "typing" : "idle",
        errorMessage: null,
        isClearingError: false,
        isGlitching: false,
      };
    }

    case "FOCUS": {
      if (state.status === "success") {
        return state;
      }
      const clamped = Math.max(0, Math.min(state.length - 1, action.index));
      return {
        ...state,
        activeIndex: clamped,
      };
    }

    case "PASTE": {
      if (state.status === "success") {
        return state;
      }
      const nextEntrySeq = [...state.entrySeq];
      const nextDigits = Array.from({ length: state.length }, (_, i) => {
        if (action.digits[i]) {
          const d = sanitizeSingleDigit(action.digits[i]);
          if (d) nextEntrySeq[i] = (nextEntrySeq[i] ?? 0) + 1;
          return d;
        }
        return state.digits[i] || "";
      });
      const filled = getFilledCount(nextDigits);
      const nextFocus = Math.min(state.length - 1, Math.max(0, filled - 1));
      return {
        ...state,
        digits: nextDigits,
        entrySeq: nextEntrySeq,
        activeIndex: nextFocus,
        status: filled > 0 ? "typing" : "idle",
        errorMessage: null,
        isClearingError: false,
        isGlitching: false,
      };
    }

    case "START_VERIFY": {
      if (!isCodeComplete(state.digits, state.length)) {
        return state;
      }
      return {
        ...state,
        status: "verifying",
        errorMessage: null,
        isClearingError: false,
        isGlitching: false,
      };
    }

    case "VERIFY_SUCCESS": {
      return {
        ...state,
        status: "success",
        errorMessage: null,
        isClearingError: false,
        isGlitching: false,
      };
    }

    case "VERIFY_ERROR": {
      return {
        ...state,
        status: "error",
        errorMessage: action.message || "That code didn't match. Try again.",
        isClearingError: false,
        isGlitching: true,
      };
    }

    case "STOP_GLITCH": {
      if (state.status !== "error") return state;
      return {
        ...state,
        isGlitching: false,
      };
    }

    case "START_ERROR_CLEAR":
    case "START_RESET": {
      if (state.status !== "error" && state.status !== "reset") return state;
      return {
        ...state,
        status: "reset",
        activeIndex: 0,
        isClearingError: true,
        isGlitching: false,
      };
    }

    case "RESET_TO_IDLE": {
      return {
        ...state,
        digits: Array.from({ length: state.length }, () => ""),
        activeIndex: 0,
        status: "idle",
        errorMessage: null,
        isClearingError: false,
        isGlitching: false,
      };
    }

    case "TICK_RESEND": {
      if (state.resendSeconds <= 0) return state;
      return {
        ...state,
        resendSeconds: state.resendSeconds - 1,
      };
    }

    case "SET_RESEND_SECONDS": {
      return {
        ...state,
        resendSeconds: Math.max(0, Math.floor(action.seconds)),
      };
    }

    case "RESEND_SUCCESS": {
      if (state.resendCount >= state.maxResends) {
        return state;
      }
      return {
        ...state,
        digits: Array.from({ length: state.length }, () => ""),
        activeIndex: 0,
        status: "idle",
        errorMessage: null,
        isClearingError: false,
        isGlitching: false,
        resendCount: state.resendCount + 1,
        resendSeconds: action.cooldownSeconds ?? 30,
        toastMessage: "Code sent",
      };
    }

    case "CLEAR_TOAST": {
      return {
        ...state,
        toastMessage: null,
      };
    }

    default:
      return state;
  }
}
