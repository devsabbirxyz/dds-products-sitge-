import React, { forwardRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { DIGISTORE_CONFIG, type CountryCode } from "@/config/auth-config";

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  icon?: React.ReactNode;
  hint?: string;
  isPhone?: boolean;
  selectedCountry?: CountryCode;
  onCountryChange?: (country: CountryCode) => void;
}

/**
 * InputField Component
 * - Height: 48px (h-12), radius: 12px (rounded-xl)
 * - Background: rgba(255,255,255,0.05), border: 1px solid rgba(255,255,255,0.10)
 * - Icons: white 45% default, sky-blue (#38bdf8) on focus
 * - Focus: border sky-blue (#38bdf8), glow ring 0 0 0 3px rgba(56,189,248,0.2)
 * - Error: red border, small red message below with gentle shake animation
 */
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      id,
      label,
      error,
      icon,
      hint,
      isPhone = false,
      selectedCountry = DIGISTORE_CONFIG.countryCodes[0],
      onCountryChange,
      className = "",
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
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
          {hint && <span className="text-[11px] font-normal text-white/40">{hint}</span>}
        </div>

        {isPhone ? (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: borderStyle,
              boxShadow: boxShadowStyle,
            }}
            className="relative flex items-center h-12 rounded-[12px] transition-all duration-200 overflow-hidden"
          >
            <label htmlFor={`${inputId}-country`} className="sr-only">
              Country Code
            </label>
            <select
              id={`${inputId}-country`}
              value={selectedCountry.code}
              onChange={(e) => {
                const found = DIGISTORE_CONFIG.countryCodes.find(
                  (c) => c.code === e.target.value
                );
                if (found && onCountryChange) onCountryChange(found);
              }}
              className="h-full bg-white/[0.04] text-white/85 text-[12px] font-medium pl-3 pr-2 border-r border-white/10 focus:outline-none cursor-pointer"
            >
              {DIGISTORE_CONFIG.countryCodes.map((c) => (
                <option key={c.code} value={c.code} className="bg-[#090d16] text-white">
                  {c.flag} {c.dialCode}
                </option>
              ))}
            </select>

            <div className="relative flex-1 h-full flex items-center">
              {icon && (
                <div
                  className={`absolute left-3 pointer-events-none transition-colors duration-200 ${
                    focused ? "text-[#34d399]" : "text-white/45"
                  }`}
                >
                  {icon}
                </div>
              )}
              <input
                ref={ref}
                id={inputId}
                type="tel"
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
                className={`w-full h-full bg-transparent text-[14px] text-white placeholder:text-white/30 ${
                  icon ? "pl-9" : "pl-3.5"
                } pr-3.5 focus:outline-none ${className}`}
                {...props}
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: borderStyle,
              boxShadow: boxShadowStyle,
            }}
            className="relative flex items-center h-12 rounded-[12px] transition-all duration-200"
          >
            {icon && (
              <div
                className={`absolute left-3.5 pointer-events-none transition-colors duration-200 ${
                  focused ? "text-[#34d399]" : "text-white/45"
                }`}
              >
                {icon}
              </div>
            )}
            <input
              ref={ref}
              id={inputId}
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
              className={`w-full h-full bg-transparent text-[14px] text-white placeholder:text-white/30 rounded-[12px] ${
                icon ? "pl-10" : "pl-3.5"
              } pr-3.5 focus:outline-none ${className}`}
              {...props}
            />
          </div>
        )}

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

InputField.displayName = "InputField";
