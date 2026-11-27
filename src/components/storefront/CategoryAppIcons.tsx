import { useId } from "react";
import type { CategoryIconKey } from "@/lib/category-explorer-utils";

interface CategoryAppIconProps {
  iconKey: CategoryIconKey;
  className?: string;
}

/**
 * Next-Gen 3D Neon-Glass App Icons for each digital product category.
 */
export function CategoryAppIcon({ iconKey, className = "h-11 w-11" }: CategoryAppIconProps) {
  const uid = useId().replace(/:/g, "");

  switch (iconKey) {
    case "bot":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`${uid}-ai-base`}
              x1="4"
              y1="4"
              x2="60"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#071C21" />
              <stop offset="50%" stopColor="#0D2E38" />
              <stop offset="100%" stopColor="#1B1438" />
            </linearGradient>
            <linearGradient
              id={`${uid}-ai-rim`}
              x1="6"
              y1="4"
              x2="58"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <radialGradient
              id={`${uid}-ai-aura`}
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(32 32) scale(26)"
            >
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#6366F1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient
              id={`${uid}-ai-core`}
              x1="16"
              y1="14"
              x2="48"
              y2="50"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
          </defs>

          {/* Outer Squircle Base + Neon Border */}
          <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#${uid}-ai-base)`} />
          <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#${uid}-ai-aura)`} />
          <rect
            x="4.75"
            y="4.75"
            width="54.5"
            height="54.5"
            rx="15.25"
            stroke={`url(#${uid}-ai-rim)`}
            strokeWidth="1.5"
            strokeOpacity="0.85"
          />

          {/* Top Glass Specular Arc */}
          <path
            d="M14 7.5H50C53.5 7.5 56 10 56 13.5V16C44 11.5 20 11.5 8 16V13.5C8 10 10.5 7.5 14 7.5Z"
            fill="#FFFFFF"
            fillOpacity="0.12"
          />

          {/* 3D Hexagonal AI Prism Ring */}
          <polygon
            points="32,13 47,21.5 47,39.5 32,48 17,39.5 17,21.5"
            fill="#10B981"
            fillOpacity="0.14"
            stroke={`url(#${uid}-ai-core)`}
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Neural Interlocking Orbits */}
          <ellipse
            cx="32"
            cy="30.5"
            rx="11"
            ry="5.2"
            transform="rotate(30 32 30.5)"
            stroke="#A7F3D0"
            strokeWidth="1.6"
            strokeOpacity="0.85"
          />
          <ellipse
            cx="32"
            cy="30.5"
            rx="11"
            ry="5.2"
            transform="rotate(-30 32 30.5)"
            stroke="#7DD3FC"
            strokeWidth="1.6"
            strokeOpacity="0.85"
          />

          {/* Center AI Spark Star */}
          <path
            d="M32 21C32.8 26.2 35.3 28.7 40.5 29.5C35.3 30.3 32.8 32.8 32 38C31.2 32.8 28.7 30.3 23.5 29.5C28.7 28.7 31.2 26.2 32 21Z"
            fill="#FFFFFF"
          />
          <circle cx="32" cy="13" r="2.2" fill="#34D399" />
          <circle cx="47" cy="21.5" r="2" fill="#38BDF8" />
          <circle cx="17" cy="39.5" r="2" fill="#A78BFA" />

          {/* Corner Gemini Twin Sparkle */}
          <path
            d="M49 11C49.5 13.8 51 15.3 53.8 15.8C51 16.3 49.5 17.8 49 20.6C48.5 17.8 47 16.3 44.2 15.8C47 15.3 48.5 13.8 49 11Z"
            fill="#FDE047"
          />
        </svg>
      );

    case "palette":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`${uid}-des-base`}
              x1="4"
              y1="4"
              x2="60"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#1A1033" />
              <stop offset="55%" stopColor="#2D123E" />
              <stop offset="100%" stopColor="#0F2438" />
            </linearGradient>
            <linearGradient
              id={`${uid}-des-rim`}
              x1="6"
              y1="4"
              x2="58"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#F472B6" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
            <linearGradient
              id={`${uid}-des-card`}
              x1="15"
              y1="16"
              x2="47"
              y2="46"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>

          <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#${uid}-des-base)`} />
          <rect
            x="4.75"
            y="4.75"
            width="54.5"
            height="54.5"
            rx="15.25"
            stroke={`url(#${uid}-des-rim)`}
            strokeWidth="1.5"
            strokeOpacity="0.85"
          />

          <path
            d="M14 7.5H50C53.5 7.5 56 10 56 13.5V16C44 11.5 20 11.5 8 16V13.5C8 10 10.5 7.5 14 7.5Z"
            fill="#FFFFFF"
            fillOpacity="0.12"
          />

          {/* Back Floating Layer */}
          <rect
            x="14"
            y="18"
            width="28"
            height="28"
            rx="8"
            transform="rotate(-12 14 18)"
            fill="#F472B6"
            fillOpacity="0.22"
            stroke="#F472B6"
            strokeOpacity="0.6"
            strokeWidth="1.3"
          />

          {/* Foreground 3D Creative Canvas */}
          <rect
            x="17"
            y="16"
            width="31"
            height="30"
            rx="9"
            fill={`url(#${uid}-des-card)`}
            stroke="#FFFFFF"
            strokeOpacity="0.6"
            strokeWidth="1.4"
          />

          {/* Crisp Play / Vector Prism */}
          <path
            d="M28.5 24.8C28.5 23.7 29.7 23.1 30.6 23.7L38.6 29.2C39.4 29.8 39.4 31 38.6 31.6L30.6 37.1C29.7 37.7 28.5 37.1 28.5 36V24.8Z"
            fill="#FFFFFF"
          />

          {/* Floating Color Spectrum Dots */}
          <circle cx="48" cy="17" r="4.2" fill="#FACC15" stroke="#FFFFFF" strokeWidth="1.4" />
          <circle cx="50.5" cy="26.5" r="3.2" fill="#22D3EE" stroke="#FFFFFF" strokeWidth="1.2" />
          <rect x="14" y="48" width="36" height="3.5" rx="1.75" fill="#FFFFFF" fillOpacity="0.22" />
          <rect x="14" y="48" width="22" height="3.5" rx="1.75" fill="#F472B6" />
        </svg>
      );

    case "tv":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`${uid}-tv-base`}
              x1="4"
              y1="4"
              x2="60"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#1F0812" />
              <stop offset="55%" stopColor="#2D0A16" />
              <stop offset="100%" stopColor="#12091C" />
            </linearGradient>
            <linearGradient
              id={`${uid}-tv-rim`}
              x1="6"
              y1="4"
              x2="58"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FB7185" />
              <stop offset="50%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
            <linearGradient
              id={`${uid}-tv-btn`}
              x1="21"
              y1="19"
              x2="43"
              y2="41"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FF2E54" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>
          </defs>

          <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#${uid}-tv-base)`} />
          <rect
            x="4.75"
            y="4.75"
            width="54.5"
            height="54.5"
            rx="15.25"
            stroke={`url(#${uid}-tv-rim)`}
            strokeWidth="1.5"
            strokeOpacity="0.88"
          />

          <path
            d="M14 7.5H50C53.5 7.5 56 10 56 13.5V16C44 11.5 20 11.5 8 16V13.5C8 10 10.5 7.5 14 7.5Z"
            fill="#FFFFFF"
            fillOpacity="0.12"
          />

          {/* Widescreen OLED Display Frame */}
          <rect
            x="10.5"
            y="14"
            width="43"
            height="31"
            rx="8.5"
            fill="#09090B"
            fillOpacity="0.85"
            stroke="#FDA4AF"
            strokeOpacity="0.55"
            strokeWidth="1.4"
          />

          {/* Glowing Center Play Orb */}
          <circle
            cx="32"
            cy="29.5"
            r="10.5"
            fill={`url(#${uid}-tv-btn)`}
            stroke="#FFE4E6"
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
          <path
            d="M29.4 25C29.4 24.1 30.4 23.6 31.1 24.1L37.4 28.5C38 29 38 30 37.4 30.5L31.1 34.9C30.4 35.4 29.4 34.9 29.4 34V25Z"
            fill="#FFFFFF"
          />

          {/* Sleek Cinema Stand Bar + UHD Indicator */}
          <path d="M22 49.5H42" stroke="#FB7185" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="48" cy="19" r="2.2" fill="#34D399" />
        </svg>
      );

    case "cpu":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`${uid}-sw-base`}
              x1="4"
              y1="4"
              x2="60"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#062229" />
              <stop offset="55%" stopColor="#0A2E36" />
              <stop offset="100%" stopColor="#0C1F38" />
            </linearGradient>
            <linearGradient
              id={`${uid}-sw-rim`}
              x1="6"
              y1="4"
              x2="58"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>

          <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#${uid}-sw-base)`} />
          <rect
            x="4.75"
            y="4.75"
            width="54.5"
            height="54.5"
            rx="15.25"
            stroke={`url(#${uid}-sw-rim)`}
            strokeWidth="1.5"
            strokeOpacity="0.85"
          />

          {/* Circuit Pins */}
          <g stroke="#38BDF8" strokeWidth="2" strokeLinecap="round">
            <path d="M24 11V15" />
            <path d="M32 11V15" />
            <path d="M40 11V15" />
            <path d="M24 49V53" />
            <path d="M32 49V53" />
            <path d="M11 24H15" />
            <path d="M11 32H15" />
            <path d="M11 40H15" />
          </g>

          {/* Frosted Pro App Window */}
          <rect
            x="15"
            y="15"
            width="31"
            height="33"
            rx="8"
            fill="#F8FAFC"
            stroke="#38BDF8"
            strokeWidth="1.2"
          />
          <rect x="20" y="21" width="14" height="3" rx="1.5" fill="#0284C7" />
          <rect x="20" y="27" width="20" height="2.6" rx="1.3" fill="#0EA5E9" />
          <rect x="20" y="32.5" width="16" height="2.6" rx="1.3" fill="#64748B" />
          <rect x="20" y="38" width="11" height="2.6" rx="1.3" fill="#10B981" />

          {/* Glowing Verified Pro Check Badge */}
          <circle cx="45" cy="41" r="10.5" fill="#10B981" stroke="#062229" strokeWidth="2.2" />
          <path
            d="M40.5 41L43.6 44L49.8 37.8"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "shield":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`${uid}-vpn-base`}
              x1="4"
              y1="4"
              x2="60"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#071936" />
              <stop offset="55%" stopColor="#0B2948" />
              <stop offset="100%" stopColor="#06283D" />
            </linearGradient>
            <linearGradient
              id={`${uid}-vpn-rim`}
              x1="6"
              y1="4"
              x2="58"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
            <linearGradient
              id={`${uid}-vpn-shield`}
              x1="16"
              y1="12"
              x2="48"
              y2="51"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>
          </defs>

          <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#${uid}-vpn-base)`} />
          <rect
            x="4.75"
            y="4.75"
            width="54.5"
            height="54.5"
            rx="15.25"
            stroke={`url(#${uid}-vpn-rim)`}
            strokeWidth="1.5"
            strokeOpacity="0.88"
          />

          {/* Outer Armor Shield */}
          <path
            d="M32 11.5L48.5 17.5V29.5C48.5 40.2 41.4 48.6 32 51.8C22.6 48.6 15.5 40.2 15.5 29.5V17.5L32 11.5Z"
            fill={`url(#${uid}-vpn-shield)`}
            stroke="#E0F2FE"
            strokeWidth="1.5"
          />

          {/* Inner Cyber Core */}
          <path
            d="M32 16L44 20.4V29.2C44 37.2 38.8 43.6 32 46.4C25.2 43.6 20 37.2 20 29.2V20.4L32 16Z"
            fill="#082F49"
            fillOpacity="0.85"
          />

          {/* Glowing Cyber Lock + Nord Peak */}
          <rect x="26.5" y="29" width="11" height="9.5" rx="2.5" fill="#38BDF8" />
          <path
            d="M28.5 29V26C28.5 24.1 30.1 22.5 32 22.5C33.9 22.5 35.5 24.1 35.5 26V29"
            stroke="#7DD3FC"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="32" cy="33.8" r="1.6" fill="#082F49" />
        </svg>
      );

    default:
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`${uid}-def-bg`}
              x1="4"
              y1="4"
              x2="60"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#1E1B4B" />
              <stop offset="50%" stopColor="#064E3B" />
              <stop offset="100%" stopColor="#311042" />
            </linearGradient>
            <linearGradient
              id={`${uid}-def-rim`}
              x1="6"
              y1="4"
              x2="58"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#${uid}-def-bg)`} />
          <rect
            x="4.75"
            y="4.75"
            width="54.5"
            height="54.5"
            rx="15.25"
            stroke={`url(#${uid}-def-rim)`}
            strokeWidth="1.5"
          />
          <path
            d="M32 15C33.8 23.5 38.5 28.2 47 30C38.5 31.8 33.8 36.5 32 45C30.2 36.5 25.5 31.8 17 30C25.5 28.2 30.2 23.5 32 15Z"
            fill="#FDE047"
          />
        </svg>
      );
  }
}
