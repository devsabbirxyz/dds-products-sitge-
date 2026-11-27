import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BG_IMAGE } from "@/config/auth-config";

/**
 * AuthBackground Component
 * - Displays the custom DEVSABBIR SOFT / DDS-Digital background image (/assets/aistudio/1793807042871_85030c27.jpg)
 *   behind the Login, Signup, and OTP verification cards.
 * - Blends with the site's Obsidian Dark (#090D16) & Emerald-Cyan (#10B981 -> #06B6D4) ambient glow.
 */
export function AuthBackground() {
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden bg-[#090D16] select-none"
      aria-hidden="true"
    >
      {/* 1. User's Custom Background Image */}
      <img
        src={BG_IMAGE}
        alt=""
        className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center scale-[1.01] opacity-65"
      />

      {/* 2. Atmospheric Obsidian & Emerald-Teal-Cyan Vignette Overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 25%, rgba(16, 185, 129, 0.18) 0%, transparent 55%),
            radial-gradient(circle at 80% 75%, rgba(6, 182, 212, 0.18) 0%, transparent 55%),
            radial-gradient(circle at 50% 50%, rgba(9, 13, 22, 0.45) 0%, rgba(9, 13, 22, 0.78) 72%, rgba(6, 9, 16, 0.90) 100%)
          `,
        }}
      />

      {/* 3. Subtle Site-Colored Emerald-to-Cyan Light Ribbon Streaks */}
      <svg
        viewBox="0 0 1600 1000"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 w-full h-full opacity-65"
      >
        <defs>
          <linearGradient id="siteRibbonFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#090d16" stopOpacity="0.5" />
            <stop offset="35%" stopColor="#064e3b" stopOpacity="0.28" />
            <stop offset="65%" stopColor="#0891b2" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#090d16" stopOpacity="0.55" />
          </linearGradient>

          <linearGradient id="emeraldCyanStreak" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="30%" stopColor="#10b981" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.92" />
            <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </linearGradient>

          <filter id="glowStreakSite" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M-200,180 C220,-80 540,420 980,240 C1320,100 1520,380 1820,260 L1820,680 C1420,520 1120,820 680,620 C280,440 40,720 -200,560 Z"
          fill="url(#siteRibbonFill)"
        />

        <path
          d="M-180,550 C220,260 640,680 1080,380 C1390,170 1610,310 1840,140"
          stroke="url(#emeraldCyanStreak)"
          strokeWidth="2.5"
          filter="url(#glowStreakSite)"
          strokeLinecap="round"
          opacity="0.75"
        />

        <path
          d="M120,940 C480,680 880,860 1320,560 C1560,390 1720,450 1880,340"
          stroke="url(#emeraldCyanStreak)"
          strokeWidth="2"
          filter="url(#glowStreakSite)"
          strokeLinecap="round"
          opacity="0.65"
        />
      </svg>

      {/* Interactive "Back to Store" pill in top-left so user can return to storefront anytime */}
      <div className="pointer-events-auto fixed top-4 left-4 z-30">
        <Link
          to="/"
          style={{
            background: "rgba(17, 24, 39, 0.72)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(16, 185, 129, 0.32)",
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium text-white/85 hover:text-white hover:border-[#10b981]/60 hover:bg-[#10b981]/15 transition-all shadow-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#34d399]" />
          <span>হোমে ফিরে যান</span>
        </Link>
      </div>
    </div>
  );
}
