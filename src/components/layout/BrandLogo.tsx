import { useId } from "react";

interface BrandLogoProps {
  siteName?: string;
  subtitle?: string;
  compact?: boolean;
}

/**
 * DDS-Digital Circled Wordmark & Circular Ring Emblem
 * Renders a sleek circular/orbital vector ring ("গোল দাগ") around the DDS-Digital brand mark and text.
 */
export function CircledBrandText({
  children = "DDS-Digital",
  className = "",
  variant = "hero",
}: {
  children?: string;
  className?: string;
  variant?: "hero" | "nav" | "section";
}) {
  const uid = useId().replace(/:/g, "");
  const isNav = variant === "nav";

  return (
    <span
      className={`relative inline-flex items-center justify-center whitespace-nowrap ${
        isNav ? "px-3 py-1" : "px-5 sm:px-7 py-1 sm:py-1.5 mx-1"
      } ${className}`}
    >
      {/* Subtle radial ambient glow behind the circled text */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-emerald-500/12 blur-md"
      />

      {/* Circular / Orbital Ring Stroke ("গোল দাগ") */}
      <svg
        viewBox="0 0 260 78"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
        className={`pointer-events-none absolute overflow-visible ${
          isNav
            ? "-inset-x-0.5 -inset-y-0.5 h-[calc(100%+4px)] w-[calc(100%+4px)]"
            : "-inset-x-1 -inset-y-1 h-[calc(100%+8px)] w-[calc(100%+8px)]"
        }`}
      >
        <defs>
          <linearGradient id={`${uid}-ring-main`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id={`${uid}-ring-soft`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Primary continuous circular/oval ring loop */}
        <path
          d="M 10 39 C 8 9, 250 8, 252 39 C 254 69, 12 71, 8 40 C 5 22, 48 10, 132 8"
          stroke={`url(#${uid}-ring-main)`}
          strokeWidth={isNav ? "3" : "2.6"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Secondary fine orbital echo arc */}
        <path
          d="M 38 68 C 114 76, 218 71, 251 47"
          stroke={`url(#${uid}-ring-soft)`}
          strokeWidth={isNav ? "1.7" : "1.5"}
          strokeLinecap="round"
        />

        {/* Luminous orbital node dot on upper-right curve */}
        <circle cx="243" cy="18" r={isNav ? "3.8" : "3.5"} fill="#34d399" />
        <circle cx="243" cy="18" r={isNav ? "6.5" : "6"} fill="#22d3ee" fillOpacity="0.28" />
      </svg>

      <span className="relative z-10 font-display font-extrabold tracking-tight text-foreground">
        {children}
      </span>
    </span>
  );
}

export function BrandLogo({
  siteName = "DDS-Digital",
  subtitle = "Digital Store",
  compact = false,
}: BrandLogoProps) {
  const uid = useId().replace(/:/g, "");

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
      {/* Circular Orbital Ring Badge ("D" inside circular ring) */}
      <div
        className={`relative grid place-items-center rounded-full shrink-0 ${
          compact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-9 w-9 sm:h-10 sm:w-10"
        }`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 44 44"
          fill="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient
              id={`${uid}-emblem-grad`}
              x1="4"
              y1="4"
              x2="40"
              y2="40"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          {/* Outer circular ring */}
          <circle
            cx="22"
            cy="22"
            r="20.5"
            stroke={`url(#${uid}-emblem-grad)`}
            strokeWidth="1.8"
            strokeDasharray="96 14"
            strokeLinecap="round"
          />
          {/* Inner filled disc */}
          <circle cx="22" cy="22" r="16.5" fill={`url(#${uid}-emblem-grad)`} />
          {/* Orbital accent dot */}
          <circle cx="37.5" cy="11" r="2.3" fill="#34d399" />
        </svg>
        <span className="relative z-10 text-primary-foreground font-display font-extrabold text-xs sm:text-sm">
          {siteName.slice(0, 1).toUpperCase()}
        </span>
      </div>

      {/* Wordmark with subtle circular ring loop around DDS-Digital */}
      <div className="flex flex-col leading-tight">
        <CircledBrandText variant="nav" className="text-xs sm:text-sm leading-none">
          {siteName}
        </CircledBrandText>
        <div className="text-[9px] sm:text-[10px] font-semibold text-primary tracking-wider uppercase pl-3 mt-0.5 whitespace-nowrap">
          {subtitle}
        </div>
      </div>
    </div>
  );
}
