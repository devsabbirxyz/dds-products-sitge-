import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatBDT } from "@/lib/storefront";
import {
  computeGiftProgress,
  DEFAULT_GIFT_THRESHOLD,
  toBanglaNumber,
} from "@/lib/trust-console-utils";
import { GiftBox3DIcon } from "./TrustStatIcons";

const FREE_GIFT_PERKS = [
  {
    id: "canva-bonus",
    title: "Canva Pro বোনাস প্যাক",
    sub: "প্রিমিয়াম টেমপ্লেট ও রিসোর্স অ্যাক্সেস",
    worth: "৳১৯৯ মূল্যমান",
  },
  {
    id: "ai-prompts",
    title: "৫০০+ AI প্রম্পট ভল্ট",
    sub: "ChatGPT ও Gemini প্রোডাক্টিভিটি বান্ডেল",
    worth: "৳১৫০ মূল্যমান",
  },
  {
    id: "vip-coupon",
    title: "VIP সিক্রেট ডিসকাউন্ট কোড",
    sub: "পরবর্তী অর্ডারে বিশেষ ফ্ল্যাট ছাড়",
    worth: "৳১০০ ছাড়",
  },
] as const;

export function FreeGiftBanner() {
  const { subtotal } = useCart();
  const [showPerks, setShowPerks] = useState(false);

  const {
    remaining,
    progressPercent,
    unlocked,
    subtotal: safeSubtotal,
  } = computeGiftProgress(subtotal, DEFAULT_GIFT_THRESHOLD);

  return (
    <section
      aria-label="Free gift offer progress"
      className="mx-auto max-w-7xl px-3.5 sm:px-6 pt-3 pb-4 sm:pt-4 sm:pb-6"
    >
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 lg:px-5 lg:py-4 transition-all duration-300"
        style={{
          background:
            "linear-gradient(135deg, rgba(6, 48, 40, 0.86) 0%, rgba(7, 26, 33, 0.92) 55%, rgba(16, 42, 35, 0.88) 100%)",
          border: unlocked
            ? "1px solid rgba(251, 191, 36, 0.45)"
            : "1px solid rgba(52, 211, 153, 0.28)",
          boxShadow:
            "0 14px 36px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        }}
      >
        {/* Top specular glass highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(110, 231, 183, 0.55), rgba(251, 191, 36, 0.45), transparent)",
          }}
        />

        {/* Ambient radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/15 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl"
        />

        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Left: 3D Icon + Main Headline + Remaining Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <GiftBox3DIcon className="h-11 w-11 sm:h-12 sm:w-12 drop-shadow-[0_6px_14px_rgba(16,185,129,0.28)]" />
              {unlocked && (
                <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-950 shadow">
                  ✓
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-xs sm:text-sm lg:text-[15px] font-bold text-white leading-snug">
                  {unlocked ? (
                    <>
                      🎉 অভিনন্দন! আপনি{" "}
                      <span className="text-amber-300">স্পেশাল ফ্রি গিফট প্যাক</span> আনলক করেছেন!
                    </>
                  ) : (
                    <>
                      🎁 {formatBDT(DEFAULT_GIFT_THRESHOLD)} টাকার অফার কিনলে{" "}
                      <span className="text-emerald-300">গিফট পাবেন</span>
                    </>
                  )}
                </p>
                <span className="text-[11px] font-medium text-emerald-200/80 tabular-nums">
                  ·{" "}
                  {unlocked
                    ? "অর্ডারের সাথে সাথে ফ্রি যুক্ত হবে"
                    : safeSubtotal > 0
                      ? `আর মাত্র ৳${toBanglaNumber(remaining)} যোগ করলেই আনলক`
                      : "৩টি প্রিমিয়াম বোনাস রিওয়ার্ড"}
                </span>
              </div>

              {/* Interactive Progress Bar + Milestone Checkpoints */}
              <div className="mt-2 flex items-center gap-2.5">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-950/80 p-0.5 ring-1 ring-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(unlocked ? 100 : 8, progressPercent)}%`,
                      background: unlocked
                        ? "linear-gradient(90deg, #10b981 0%, #fbbf24 100%)"
                        : "linear-gradient(90deg, #059669 0%, #34d399 65%, #fbbf24 100%)",
                      boxShadow: "0 0 12px rgba(52, 211, 153, 0.45)",
                    }}
                  />
                </div>
                <span className="shrink-0 text-[11px] font-bold tabular-nums text-emerald-300">
                  ৳{toBanglaNumber(safeSubtotal)} / ৳{toBanglaNumber(DEFAULT_GIFT_THRESHOLD)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Interactive Actions (View Perks + Shop/Claim CTA) */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 md:pt-0 border-t border-white/10 md:border-t-0">
            <button
              type="button"
              onClick={() => setShowPerks((prev) => !prev)}
              aria-expanded={showPerks}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-emerald-100 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>গিফট কী কী?</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-emerald-300 transition-transform duration-200 ${
                  showPerks ? "rotate-180" : ""
                }`}
              />
            </button>

            <Link
              to={unlocked ? "/cart" : "/shop"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-3.5 py-1.5 text-[11px] sm:text-xs font-bold text-primary-foreground shadow-glow hover:brightness-110 active:scale-95 transition whitespace-nowrap shrink-0"
            >
              <span>{unlocked ? "গিফট ক্লেইম করুন" : "অফার দেখুন"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Expandable Reward Perks Drawer */}
        {showPerks && (
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {FREE_GIFT_PERKS.map((perk) => (
              <div
                key={perk.id}
                className="flex items-center justify-between gap-2.5 rounded-xl bg-slate-950/55 border border-emerald-400/15 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{perk.title}</div>
                    <div className="text-[10px] text-slate-300/75 truncate">{perk.sub}</div>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-amber-300 tabular-nums">
                  {perk.worth}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
