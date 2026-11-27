import { useId } from "react";

interface IconProps {
  className?: string;
}

export function GiftBox3DIcon({ className = "h-10 w-10" }: IconProps) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" fill="none" className={` select-none ${className}`} aria-hidden="true">
      <defs>
        <linearGradient
          id={`${uid}-bg`}
          x1="4"
          y1="4"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="55%" stopColor="#042f2e" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${uid}-box`}
          x1="12"
          y1="18"
          x2="36"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient
          id={`${uid}-ribbon`}
          x1="18"
          y1="10"
          x2="30"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${uid}-bg)`} />
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${uid}-glow)`} />
      <rect
        x="2.75"
        y="2.75"
        width="42.5"
        height="42.5"
        rx="12.25"
        stroke="#34d399"
        strokeOpacity="0.4"
        strokeWidth="1.2"
      />

      {/* Gift box base */}
      <rect
        x="13"
        y="22"
        width="22"
        height="15"
        rx="3.5"
        fill={`url(#${uid}-box)`}
        stroke="#a7f3d0"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      {/* Gift box lid */}
      <rect
        x="11"
        y="17.5"
        width="26"
        height="5.5"
        rx="2.2"
        fill="#059669"
        stroke="#6ee7b7"
        strokeWidth="1.1"
      />

      {/* Golden vertical & horizontal ribbon */}
      <rect x="22" y="17.5" width="4" height="19.5" rx="1" fill={`url(#${uid}-ribbon)`} />
      <rect x="13" y="27.5" width="22" height="3.2" fill={`url(#${uid}-ribbon)`} opacity="0.9" />

      {/* 3D Bow loops */}
      <path
        d="M24 17.5C20.5 17.5 17 15 18 12.5C19 10.2 22.5 13 24 17.5Z"
        fill={`url(#${uid}-ribbon)`}
        stroke="#fef3c7"
        strokeWidth="0.9"
      />
      <path
        d="M24 17.5C27.5 17.5 31 15 30 12.5C29 10.2 25.5 13 24 17.5Z"
        fill={`url(#${uid}-ribbon)`}
        stroke="#fef3c7"
        strokeWidth="0.9"
      />

      {/* Sparkle stars */}
      <path
        d="M37 11L38 13.3L40.3 14.3L38 15.3L37 17.6L36 15.3L33.7 14.3L36 13.3L37 11Z"
        fill="#fde68a"
      />
      <circle cx="11.5" cy="12.5" r="1.4" fill="#6ee7b7" />
    </svg>
  );
}

export function OrdersDelivered3DIcon({ className = "h-10 w-10" }: IconProps) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" fill="none" className={`select-none ${className}`} aria-hidden="true">
      <defs>
        <linearGradient
          id={`${uid}-bg`}
          x1="4"
          y1="4"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#052e2b" />
          <stop offset="100%" stopColor="#021f1d" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="40%" r="58%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#052e2b" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${uid}-top`}
          x1="12"
          y1="11"
          x2="36"
          y2="23"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient
          id={`${uid}-left`}
          x1="11"
          y1="18"
          x2="24"
          y2="37"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient
          id={`${uid}-right`}
          x1="24"
          y1="18"
          x2="37"
          y2="37"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${uid}-bg)`} />
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${uid}-glow)`} />
      <rect
        x="2.75"
        y="2.75"
        width="42.5"
        height="42.5"
        rx="12.25"
        stroke="#34d399"
        strokeOpacity="0.38"
        strokeWidth="1.2"
      />

      {/* 3D Isometric Package Cube */}
      <path d="M24 10.5L36.5 17.2L24 23.8L11.5 17.2L24 10.5Z" fill={`url(#${uid}-top)`} />
      <path d="M11.5 17.2L24 23.8V37L11.5 30.2V17.2Z" fill={`url(#${uid}-left)`} />
      <path d="M36.5 17.2L24 23.8V37L36.5 30.2V17.2Z" fill={`url(#${uid}-right)`} />

      {/* Package tape seam */}
      <path
        d="M17.8 13.8L30.2 20.5V25.5"
        stroke="#ecfdf5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />

      {/* Floating Verified Checkmark Disc */}
      <circle cx="34.5" cy="33.5" r="7" fill="#064e3b" stroke="#6ee7b7" strokeWidth="1.4" />
      <path
        d="M31.6 33.5L33.6 35.5L37.6 31.5"
        stroke="#6ee7b7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HappyCustomers3DIcon({ className = "h-10 w-10" }: IconProps) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" fill="none" className={`select-none ${className}`} aria-hidden="true">
      <defs>
        <linearGradient
          id={`${uid}-bg`}
          x1="4"
          y1="4"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#042f2e" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#042f2e" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${uid}-user1`}
          x1="14"
          y1="13"
          x2="30"
          y2="35"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient
          id={`${uid}-user2`}
          x1="25"
          y1="16"
          x2="38"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${uid}-bg)`} />
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${uid}-glow)`} />
      <rect
        x="2.75"
        y="2.75"
        width="42.5"
        height="42.5"
        rx="12.25"
        stroke="#2dd4bf"
        strokeOpacity="0.38"
        strokeWidth="1.2"
      />

      {/* Secondary user silhouette right */}
      <circle cx="31" cy="18.5" r="4.2" fill={`url(#${uid}-user2)`} opacity="0.85" />
      <path
        d="M24.5 32.5C24.5 28.6 27.4 26 31 26C34.6 26 37.5 28.6 37.5 32.5V34H24.5V32.5Z"
        fill={`url(#${uid}-user2)`}
        opacity="0.8"
      />

      {/* Primary user 3D avatar front-left */}
      <circle
        cx="20.5"
        cy="17"
        r="5.2"
        fill={`url(#${uid}-user1)`}
        stroke="#ccfbf1"
        strokeWidth="1.1"
      />
      <path
        d="M11.5 33.5C11.5 28.5 15.4 25.2 20.5 25.2C25.6 25.2 29.5 28.5 29.5 33.5V35.2H11.5V33.5Z"
        fill={`url(#${uid}-user1)`}
        stroke="#99f6e4"
        strokeWidth="1.1"
      />

      {/* Bangladesh Flag Inspired Badge (Green + Red Sun Disc) */}
      <circle cx="34.5" cy="34" r="6.2" fill="#006a4e" stroke="#6ee7b7" strokeWidth="1.3" />
      <circle cx="34.2" cy="34" r="2.8" fill="#f42a41" />
    </svg>
  );
}

export function RatingCrystal3DIcon({ className = "h-10 w-10" }: IconProps) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" fill="none" className={`select-none ${className}`} aria-hidden="true">
      <defs>
        <linearGradient
          id={`${uid}-bg`}
          x1="4"
          y1="4"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1e1b18" />
          <stop offset="55%" stopColor="#042f2e" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.42" />
          <stop offset="65%" stopColor="#10b981" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${uid}-star`}
          x1="12"
          y1="10"
          x2="36"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="48%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${uid}-bg)`} />
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${uid}-glow)`} />
      <rect
        x="2.75"
        y="2.75"
        width="42.5"
        height="42.5"
        rx="12.25"
        stroke="#fbbf24"
        strokeOpacity="0.4"
        strokeWidth="1.2"
      />

      {/* Glowing halo ring */}
      <circle
        cx="24"
        cy="24"
        r="14"
        stroke="#fbbf24"
        strokeOpacity="0.24"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* 3D Faceted Star Crystal */}
      <path
        d="M24 9.5L28.1 18.1L37.5 19.4L30.7 26L32.3 35.4L24 30.9L15.7 35.4L17.3 26L10.5 19.4L19.9 18.1L24 9.5Z"
        fill={`url(#${uid}-star)`}
        stroke="#fef9c3"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Inner 3D facet lines */}
      <path
        d="M24 9.5V23.5M24 23.5L37.5 19.4M24 23.5L32.3 35.4M24 23.5L15.7 35.4M24 23.5L10.5 19.4"
        stroke="#fffbeb"
        strokeOpacity="0.45"
        strokeWidth="0.9"
      />
    </svg>
  );
}

export function SecureVault3DIcon({ className = "h-10 w-10" }: IconProps) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" fill="none" className={`select-none ${className}`} aria-hidden="true">
      <defs>
        <linearGradient
          id={`${uid}-bg`}
          x1="4"
          y1="4"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#022c22" />
          <stop offset="100%" stopColor="#091526" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="40%" r="58%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${uid}-shield`}
          x1="12"
          y1="9"
          x2="36"
          y2="39"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${uid}-bg)`} />
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${uid}-glow)`} />
      <rect
        x="2.75"
        y="2.75"
        width="42.5"
        height="42.5"
        rx="12.25"
        stroke="#34d399"
        strokeOpacity="0.4"
        strokeWidth="1.2"
      />

      {/* Outer Armored Shield */}
      <path
        d="M24 8.5L36 13.3V22.8C36 30.8 30.8 36.9 24 39.5C17.2 36.9 12 30.8 12 22.8V13.3L24 8.5Z"
        fill={`url(#${uid}-shield)`}
        fillOpacity="0.22"
        stroke="#6ee7b7"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner Shield Core */}
      <path
        d="M24 12L32.8 15.6V22.5C32.8 28.5 29 33.2 24 35.3C19 33.2 15.2 28.5 15.2 22.5V15.6L24 12Z"
        fill={`url(#${uid}-shield)`}
        opacity="0.9"
      />

      {/* 3D Cyber Padlock inside shield */}
      <rect
        x="19.5"
        y="22"
        width="9"
        height="7.5"
        rx="2"
        fill="#022c22"
        stroke="#a7f3d0"
        strokeWidth="1.2"
      />
      <path
        d="M21.5 22V19.8C21.5 18.4 22.6 17.3 24 17.3C25.4 17.3 26.5 18.4 26.5 19.8V22"
        stroke="#ecfdf5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="25.5" r="1.2" fill="#6ee7b7" />
    </svg>
  );
}
