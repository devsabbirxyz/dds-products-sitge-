import React from "react";

export interface PasswordStrengthProps {
  password: string;
}

export function calculatePasswordStrength(pass: string): {
  score: number;
  label: "Weak" | "Medium" | "Strong";
  colorClass: string;
  barColor: string;
  hint: string;
} {
  const hasLength = pass.length >= 8;
  const hasUpper = /[A-Z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSymbol = /[^A-Za-z0-9]/.test(pass);

  const passedCount = [hasLength, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

  const missing: string[] = [];
  if (!hasLength) missing.push("8+ chars");
  if (!hasUpper) missing.push("uppercase");
  if (!hasNumber) missing.push("number");
  if (!hasSymbol) missing.push("symbol");

  if (passedCount <= 2 || !hasLength) {
    return {
      score: passedCount === 0 ? 0 : 1,
      label: "Weak",
      colorClass: "text-rose-400",
      barColor: "#f43f5e",
      hint: missing.length ? `Add ${missing.join(", ")}` : "Weak password",
    };
  }

  if (passedCount === 3) {
    return {
      score: 2,
      label: "Medium",
      colorClass: "text-amber-400",
      barColor: "#f59e0b",
      hint: missing.length ? `Add ${missing.join(", ")} for strong` : "Medium strength",
    };
  }

  return {
    score: 3,
    label: "Strong",
    colorClass: "text-emerald-400",
    barColor: "#10b981",
    hint: "Strong & secure password",
  };
}

/**
 * PasswordStrength Component
 * Thin live password-strength bar under the password (weak red / medium amber / strong green)
 * with tiny hint text.
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const { score, label, colorClass, barColor, hint } = calculatePasswordStrength(password);

  return (
    <div className="pt-0.5 space-y-1.5">
      {/* Thin 3-segment live strength bar */}
      <div className="grid grid-cols-3 gap-1.5 h-1 w-full">
        {[1, 2, 3].map((segment) => (
          <div
            key={segment}
            className="h-full rounded-full transition-all duration-300"
            style={{
              backgroundColor: score >= segment ? barColor : "rgba(255, 255, 255, 0.12)",
              boxShadow: score >= segment ? `0 0 8px ${barColor}66` : "none",
            }}
          />
        ))}
      </div>

      {/* Tiny hint text */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-white/45">{hint}</span>
        <span className={`font-medium ${colorClass}`}>{label}</span>
      </div>
    </div>
  );
}
