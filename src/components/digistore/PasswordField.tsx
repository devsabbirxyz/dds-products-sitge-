import React, { useState, forwardRef } from "react";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
}

/**
 * PasswordField Component
 * - Height: 48px (h-12), radius: 12px (rounded-[12px])
 * - Background: rgba(255,255,255,0.05), border: 1px solid rgba(255,255,255,0.10)
 * - Left lock icon (white 45%, turns #38bdf8 on focus)
 * - Right eye/eye-off toggle
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ id, label, error, className = "", onFocus, onBlur, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);

    const inputId = id || `password-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const errorId = `${inputId}-error`;

    const borderStyle = error
      ? "1px solid rgba(244, 63, 94, 0.85)"
      : focused
        ? "1px solid #10b981"
        : "1px solid rgba(255, 255, 255, 0.12)";

    const boxShadowStyle = error
      ? "0 0 0 3px rgba(244, 63, 94, 0.18)"
      : focused
        ? "0 0 0 3px rgba(16, 185, 129, 0.22)"
        : "none";

    return (
      <div className={`w-full ${error ? "animate-shake" : ""}`}>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-white/85 tracking-tight"
          >
            {label}
          </label>
        </div>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: borderStyle,
            boxShadow: boxShadowStyle,
          }}
          className="relative flex items-center h-12 rounded-[12px] transition-all duration-200"
        >
          <div
            className={`absolute left-3.5 pointer-events-none transition-colors duration-200 ${
              focused ? "text-[#34d399]" : "text-white/45"
            }`}
          >
            <Lock className="w-4 h-4" />
          </div>

          <input
            ref={ref}
            id={inputId}
            type={showPassword ? "text" : "password"}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            className={`w-full h-full bg-transparent text-[14px] text-white placeholder:text-white/30 rounded-[12px] pl-10 pr-11 focus:outline-none ${className}`}
            {...props}
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 p-1.5 rounded-lg text-white/45 hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] transition-colors cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-400"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

PasswordField.displayName = "PasswordField";
