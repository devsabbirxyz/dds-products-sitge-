import React, { useRef, useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useAnimation,
} from "framer-motion";

export interface GlassCardProps {
  children: React.ReactNode;
  maxWidthClass?: string;
  className?: string;
  transitionTrigger?: string;
}

/**
 * GlassCard Component (Site Brand Theme: Obsidian Slate + Emerald-Teal-Cyan Glow)
 * - Frosted glass matching DDS-Digital design system (#111827 / #090D16 + #10B981 -> #06B6D4)
 * - Chamfered Top-Left & Bottom-Right Corners with Emerald-Cyan triangle shards
 */
export function GlassCard({
  children,
  maxWidthClass = "max-w-[460px]",
  className = "",
  transitionTrigger = "login",
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);
  const isFirstRender = useRef(true);

  const topShardControls = useAnimation();
  const botShardControls = useAnimation();
  const flashControls = useAnimation();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const touchCapable =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia("(pointer: coarse)").matches;
      setIsTouch(touchCapable);
    }
  }, []);

  // Trigger the signature 2-triangle center collision & return animation whenever mode changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const rect = cardRef.current?.getBoundingClientRect();
    const w = rect?.width || 460;
    const h = rect?.height || 540;

    const targetTopX = Math.round(w * 0.42);
    const targetTopY = Math.round(h * 0.42);

    const targetBotX = -Math.round(w * 0.42);
    const targetBotY = -Math.round(h * 0.42);

    topShardControls.start({
      x: [0, targetTopX, 0],
      y: [0, targetTopY, 0],
      scale: [1, 1.38, 1],
      rotate: [0, 12, 0],
      filter: [
        "drop-shadow(0 6px 16px rgba(16,185,129,0.32))",
        "drop-shadow(0 0 36px rgba(52,211,153,0.95))",
        "drop-shadow(0 6px 16px rgba(16,185,129,0.32))",
      ],
      transition: {
        duration: 0.65,
        times: [0, 0.48, 1],
        ease: [0.22, 1, 0.36, 1],
      },
    });

    botShardControls.start({
      x: [0, targetBotX, 0],
      y: [0, targetBotY, 0],
      scale: [1, 1.45, 1],
      rotate: [0, -12, 0],
      filter: [
        "drop-shadow(0 4px 14px rgba(6,182,212,0.3))",
        "drop-shadow(0 0 36px rgba(34,211,238,0.95))",
        "drop-shadow(0 4px 14px rgba(6,182,212,0.3))",
      ],
      transition: {
        duration: 0.65,
        times: [0, 0.48, 1],
        ease: [0.22, 1, 0.36, 1],
      },
    });

    flashControls.start({
      opacity: [0, 0.65, 0],
      scale: [0.7, 1.15, 0.9],
      transition: {
        duration: 0.65,
        times: [0, 0.48, 1],
        ease: "easeInOut",
      },
    });
  }, [transitionTrigger, topShardControls, botShardControls, flashControls]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 130, mass: 0.7 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [2.2, -2.2]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-2.2, 2.2]);

  const shardTopHoverX = useTransform(smoothX, [-0.5, 0.5], [4.5, -4.5]);
  const shardTopHoverY = useTransform(smoothY, [-0.5, 0.5], [4.5, -4.5]);

  const shardBotHoverX = useTransform(smoothX, [-0.5, 0.5], [-4, 4]);
  const shardBotHoverY = useTransform(smoothY, [-0.5, 0.5], [-4, 4]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isTouch || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <motion.div
      ref={cardRef}
      initial={false}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: isTouch ? 0 : rotateX,
        rotateY: isTouch ? 0 : rotateY,
        transformPerspective: 1200,
      }}
      className={`relative w-full ${maxWidthClass} mx-auto transition-[max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu will-change-transform ${className}`}
    >
      {/* Ambient Outer Shadow & Site Brand Emerald-Cyan Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[28px]"
        style={{
          boxShadow:
            "0 30px 80px rgba(0, 0, 0, 0.72), 0 0 60px rgba(16, 185, 129, 0.18), 0 0 40px rgba(6, 182, 212, 0.14)",
        }}
      />

      {/* TOP-LEFT FLOATING EMERALD-CYAN GLASS TRIANGLE SHARD */}
      <motion.div
        aria-hidden="true"
        style={{
          x: isTouch ? 0 : shardTopHoverX,
          y: isTouch ? 0 : shardTopHoverY,
        }}
        className="pointer-events-none absolute -top-2 -left-2 z-30 w-[72px] h-[72px] transform-gpu"
      >
        <motion.div animate={topShardControls} className="w-full h-full">
          <svg viewBox="0 0 72 72" fill="none" className="w-full h-full">
            <defs>
              <linearGradient
                id="topShardFill"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="rgba(52, 211, 153, 0.38)" />
                <stop offset="55%" stopColor="rgba(16, 185, 129, 0.22)" />
                <stop offset="100%" stopColor="rgba(6, 182, 212, 0.12)" />
              </linearGradient>
              <linearGradient
                id="topShardStroke"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="rgba(110, 231, 183, 1)" />
                <stop offset="60%" stopColor="rgba(16, 185, 129, 0.75)" />
                <stop offset="100%" stopColor="rgba(34, 211, 238, 0.35)" />
              </linearGradient>
            </defs>
            <path
              d="M 6,22 Q 6,6 22,6 L 58,6 Q 66,6 60,12 L 12,60 Q 6,66 6,58 Z"
              fill="url(#topShardFill)"
              stroke="url(#topShardStroke)"
              strokeWidth="1.4"
            />
          </svg>
        </motion.div>
      </motion.div>

      {/* BOTTOM-RIGHT MATCHING CYAN-EMERALD GLASS TRIANGLE SHARD */}
      <motion.div
        aria-hidden="true"
        style={{
          x: isTouch ? 0 : shardBotHoverX,
          y: isTouch ? 0 : shardBotHoverY,
        }}
        className="pointer-events-none absolute -bottom-2 -right-2 z-30 w-[56px] h-[56px] transform-gpu"
      >
        <motion.div animate={botShardControls} className="w-full h-full">
          <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
            <defs>
              <linearGradient
                id="botShardFill"
                x1="100%"
                y1="100%"
                x2="0%"
                y2="0%"
              >
                <stop offset="0%" stopColor="rgba(34, 211, 238, 0.36)" />
                <stop offset="60%" stopColor="rgba(16, 185, 129, 0.20)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.08)" />
              </linearGradient>
              <linearGradient
                id="botShardStroke"
                x1="100%"
                y1="100%"
                x2="0%"
                y2="0%"
              >
                <stop offset="0%" stopColor="rgba(103, 232, 249, 0.95)" />
                <stop offset="65%" stopColor="rgba(16, 185, 129, 0.65)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.25)" />
              </linearGradient>
            </defs>
            <path
              d="M 50,36 Q 50,50 36,50 L 12,50 Q 6,50 11,45 L 45,11 Q 50,6 50,12 Z"
              fill="url(#botShardFill)"
              stroke="url(#botShardStroke)"
              strokeWidth="1.4"
            />
          </svg>
        </motion.div>
      </motion.div>

      {/* MAIN CHAMFERED FROSTED GLASS PANEL */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(17, 24, 39, 0.80) 0%, rgba(13, 19, 32, 0.72) 100%)",
          backdropFilter: "blur(26px) saturate(150%)",
          WebkitBackdropFilter: "blur(26px) saturate(150%)",
          border: "1px solid rgba(16, 185, 129, 0.26)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.22)",
          clipPath:
            "polygon(58px 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%, 0 58px)",
        }}
        className="relative z-10 rounded-[28px] p-7 sm:p-9 overflow-hidden"
      >
        {/* Center Emerald-Cyan Flash Glow when triangles meet */}
        <motion.div
          animate={flashControls}
          initial={{ opacity: 0 }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        >
          <div
            className="w-64 h-64 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(16, 185, 129, 0.65) 0%, rgba(6, 182, 212, 0.25) 50%, transparent 75%)",
            }}
          />
        </motion.div>

        {/* Top Glowing Emerald-Cyan Specular Edge Line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-[58px] right-8 h-[1.5px]"
          style={{
            background:
              "linear-gradient(90deg, rgba(52, 211, 153, 0.92) 0%, rgba(6, 182, 212, 0.50) 50%, transparent 100%)",
          }}
        />

        {/* Left Glowing Emerald-Cyan Specular Edge Line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[58px] bottom-10 left-0 w-[1.5px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(52, 211, 153, 0.88) 0%, rgba(6, 182, 212, 0.40) 50%, transparent 100%)",
          }}
        />

        {/* Diagonal Chamfer Inner Rim Highlight (Top-Left Cut Line) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 60 60"
          className="pointer-events-none absolute top-0 left-0 w-[60px] h-[60px]"
        >
          <line
            x1="0"
            y1="58"
            x2="58"
            y2="0"
            stroke="rgba(52, 211, 153, 0.80)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Diagonal Chamfer Inner Rim Highlight (Bottom-Right Cut Line) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 42 42"
          className="pointer-events-none absolute bottom-0 right-0 w-[42px] h-[42px]"
        >
          <line
            x1="0"
            y1="40"
            x2="40"
            y2="0"
            stroke="rgba(34, 211, 238, 0.72)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Subtle Top-Left Internal Radial Emerald-Cyan Sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-25 blur-2xl"
          style={{
            background:
              "radial-gradient(circle, rgba(16, 185, 129, 0.55) 0%, rgba(6, 182, 212, 0.25) 45%, transparent 70%)",
          }}
        />

        {/* Card Content */}
        <div className="relative z-10">{children}</div>
      </div>
    </motion.div>
  );
}
