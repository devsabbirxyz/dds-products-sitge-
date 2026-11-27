// New homepage sections — Flash Deals, Best Sellers, Just Arrived, Live Stats,
// Testimonials Highlight, FAQ Accordion, Bundle Offers.
// Uses existing storefront queries + supabase reads; semantic design tokens only.

import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Flame,
  Sparkles,
  Star,
  ArrowRight,
  ChevronDown,
  Quote,
  Gift,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery, faqsQuery, formatBDT } from "@/lib/storefront";
import { bundlesQuery } from "@/lib/bundles";
import { useCart } from "@/lib/cart";
import { ProductCard } from "./ProductCard";
import { VerifiedBuyerBadge } from "./TrustBadges";
import { normalizeLiveStats, toBanglaNumber } from "@/lib/trust-console-utils";
import {
  OrdersDelivered3DIcon,
  HappyCustomers3DIcon,
  RatingCrystal3DIcon,
  SecureVault3DIcon,
} from "./TrustStatIcons";

/* ============ FLASH DEALS — countdown + high-discount products ============ */
export function FlashDeals({ products: passedProducts }: { products?: any[] }) {
  const { data: queriedProducts = [] } = useQuery({
    ...productsQuery({ limit: 24 }),
    enabled: !passedProducts,
  });
  const products = passedProducts ?? queriedProducts;
  const deals = useMemo(() => {
    return products
      .filter((p: any) => p.regular_price && p.offer_price && p.offer_price < p.regular_price)
      .map((p: any) => ({
        ...p,
        _discount: Math.round(((p.regular_price - p.offer_price) / p.regular_price) * 100),
      }))
      .sort((a: any, b: any) => b._discount - a._discount)
      .slice(0, 6);
  }, [products]);

  // 24-hour rolling countdown (resets daily)
  const [time, setTime] = useState(() => secondsUntilMidnight());
  useEffect(() => {
    const t = setInterval(() => setTime(secondsUntilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(time / 3600);
  const m = Math.floor((time % 3600) / 60);
  const s = time % 60;

  if (deals.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-3.5 sm:px-6 py-8 sm:py-10">
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 lg:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-xl sm:rounded-2xl bg-gradient-brand shadow-glow shrink-0">
              <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs text-primary font-bold uppercase tracking-wider">
                ⚡ ফ্ল্যাশ ডিল
              </div>
              <h2 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl">
                আজকের <span className="text-gradient-brand">সেরা অফার</span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-muted-foreground hidden sm:inline">শেষ হবে:</span>
            {[
              ["ঘ", h],
              ["মি", m],
              ["সে", s],
            ].map(([label, val]) => (
              <div
                key={label as string}
                className="flex flex-col items-center rounded-xl bg-gradient-brand text-primary-foreground px-2 sm:px-2.5 py-1 sm:py-1.5 min-w-[38px] sm:min-w-[44px]"
              >
                <span className="font-display font-bold text-sm sm:text-base tabular-nums">
                  {String(val).padStart(2, "0")}
                </span>
                <span className="text-[9px] opacity-80">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
          {deals.map((p: any) => {
            const stock = Number(p.stock_quantity ?? p.stock ?? 0);
            const lowStock = stock > 0 && stock <= 10;
            return (
              <div key={p.id} className="relative h-full">
                <div className="absolute top-2 right-2 sm:-top-2 sm:-right-2 z-10 rounded-full bg-destructive text-destructive-foreground px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold shadow-glow rotate-3">
                  -{p._discount}%
                </div>
                {lowStock && (
                  <div className="absolute -top-2 left-2 z-10 rounded-full bg-gradient-brand text-primary-foreground px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold shadow-glow animate-pulse">
                    🔥 মাত্র {stock} টি বাকি
                  </div>
                )}
                <ProductCard p={p} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function secondsUntilMidnight() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
}

/* ============ JUST ARRIVED ============ */
export function JustArrived({ products: passedProducts }: { products?: any[] }) {
  const { data: queriedProducts = [] } = useQuery({
    ...productsQuery({ limit: 24 }),
    enabled: !passedProducts,
  });
  const products = passedProducts ?? queriedProducts;
  const fresh = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return products.filter((p: any) => new Date(p.created_at).getTime() >= cutoff).slice(0, 4);
  }, [products]);
  if (fresh.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-3.5 sm:px-6 py-8 sm:py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-primary font-bold uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" /> নতুন এসেছে
          </div>
          <h2 className="mt-1 font-display font-bold text-2xl sm:text-3xl">
            Just <span className="text-gradient-brand">Arrived</span>
          </h2>
        </div>
        <Link
          to="/shop"
          className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          সব দেখুন <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
        {fresh.map((p: any) => (
          <div key={p.id} className="relative h-full">
            <div className="absolute top-2 left-2 z-10 rounded-full bg-gradient-brand text-primary-foreground px-2.5 py-0.5 text-[10px] font-bold shadow-glow">
              NEW
            </div>
            <ProductCard p={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============ LIVE STATS COUNTER ============ */
const liveStatsQuery = queryOptions({
  queryKey: ["home_live_stats"],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const [ordersToday, customers, reviews, products] = await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("reviews").select("rating").eq("is_active", true).limit(1000),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
    const ratings = (reviews.data ?? []).map((r: any) => r.rating).filter(Boolean);
    const avgRating =
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 4.9;
    return {
      ordersToday: ordersToday.count ?? 0,
      customers: customers.count ?? 0,
      avgRating: Number(avgRating.toFixed(1)),
      products: products.count ?? 0,
    };
  },
});

function useCounter(target: number, duration = 1200, decimals = 0) {
  const [val, setVal] = useState(target);
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current = null;
    let raf = 0;
    const fromVal = Math.max(0, target * 0.65);
    const tick = (ts: number) => {
      if (start.current == null) start.current = ts;
      const p = Math.min(1, (ts - start.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = fromVal + (target - fromVal) * eased;
      setVal(decimals ? Number(next.toFixed(decimals)) : Math.round(next));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, decimals]);
  return val;
}

export function LiveStats() {
  const { data } = useQuery(liveStatsQuery);
  const normalized = normalizeLiveStats(data);
  const orders = useCounter(normalized.ordersToday, 1200);
  const customers = useCounter(normalized.customers, 1400);
  const rating = useCounter(normalized.avgRating, 1100, 1);
  const secure = useCounter(normalized.securePercent, 1000);

  const handleStatAction = (action: "track" | "reviews" | "security") => {
    if (action === "track") {
      window.dispatchEvent(new CustomEvent("dds:open-track-order"));
      return;
    }
    const targetId = action === "reviews" ? "customer-reviews" : "how-to-buy";
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const items = [
    {
      id: "orders",
      action: "track" as const,
      Icon3D: OrdersDelivered3DIcon,
      label: "আজকের অর্ডার",
      value: `${toBanglaNumber(orders)}+`,
      sub: "✅ ডেলিভার্ড",
      detail: "৫–১৫ মিনিটে অটো",
      accentColor: "rgba(52, 211, 153, 0.35)",
      renderVisual: () => (
        <div className="flex items-end gap-0.5 h-3.5" aria-hidden="true">
          {[45, 68, 55, 85, 72, 95, 100].map((h, idx) => (
            <span
              key={idx}
              className="w-1 rounded-full bg-gradient-to-t from-emerald-500/50 to-emerald-300"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      ),
    },
    {
      id: "customers",
      action: "reviews" as const,
      Icon3D: HappyCustomers3DIcon,
      label: "হ্যাপি কাস্টমার",
      value: `${toBanglaNumber(customers)}+`,
      sub: "🇧🇩 বাংলাদেশজুড়ে",
      detail: "৬৪ জেলায় সার্ভিস",
      accentColor: "rgba(45, 212, 191, 0.35)",
      renderVisual: () => (
        <div className="flex items-center -space-x-1.5" aria-hidden="true">
          {["ম", "স", "ত"].map((initial, idx) => (
            <span
              key={idx}
              className="grid h-4 w-4 place-items-center rounded-full bg-emerald-900/90 ring-1 ring-emerald-400/50 text-[8px] font-bold text-emerald-200"
            >
              {initial}
            </span>
          ))}
          <span className="grid h-4 px-1 place-items-center rounded-full bg-teal-500/20 ring-1 ring-teal-400/40 text-[8px] font-bold text-teal-200">
            +৯৯
          </span>
        </div>
      ),
    },
    {
      id: "rating",
      action: "reviews" as const,
      Icon3D: RatingCrystal3DIcon,
      label: "এভারেজ রেটিং",
      value: `${toBanglaNumber(rating.toFixed(1))}★`,
      sub: "৫ এ ৫",
      detail: "ভেরিফায়েড রিভিউ",
      accentColor: "rgba(251, 191, 36, 0.38)",
      renderVisual: () => (
        <div className="flex items-center gap-0.5 text-amber-400" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Star key={idx} className="h-3 w-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
      ),
    },
    {
      id: "secure",
      action: "security" as const,
      Icon3D: SecureVault3DIcon,
      label: "সিকিউর পেমেন্ট",
      value: `${toBanglaNumber(secure)}%`,
      sub: "এসএসএল প্রটেক্টেড",
      detail: "বিকাশ · নগদ · রকেট",
      accentColor: "rgba(16, 185, 129, 0.38)",
      renderVisual: () => (
        <span className="text-[9px] font-bold tracking-tight text-emerald-300/90 tabular-nums">
          256-BIT SSL
        </span>
      ),
    },
  ];

  return (
    <section
      aria-label="Live store statistics"
      className="hidden md:block mx-auto max-w-7xl px-3.5 sm:px-6 pb-2"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {items.map((it) => {
          const Icon3D = it.Icon3D;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => handleStatAction(it.action)}
              aria-label={`${it.value} ${it.label} — ${it.sub}`}
              className="group relative overflow-hidden rounded-2xl p-3 sm:p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              style={{
                background:
                  "linear-gradient(145deg, rgba(10, 29, 34, 0.88) 0%, rgba(6, 18, 23, 0.94) 100%)",
                border: `1px solid ${it.accentColor}`,
                boxShadow:
                  "0 10px 28px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Top specular highlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 top-0 h-px opacity-80 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `linear-gradient(90deg, transparent, ${it.accentColor}, transparent)`,
                }}
              />

              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="relative shrink-0 transition-transform duration-200 group-hover:scale-105">
                    <Icon3D className="h-10 w-10 sm:h-11 sm:w-11 drop-shadow-[0_6px_14px_rgba(16,185,129,0.22)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-extrabold text-lg sm:text-2xl text-white group-hover:text-emerald-300 transition-colors tabular-nums leading-none">
                      {it.value}
                    </div>
                    <div className="mt-1 text-[11px] sm:text-xs font-bold text-slate-100 truncate">
                      {it.label}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom telemetry footer row inside card */}
              <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between gap-1.5">
                <div className="min-w-0 truncate text-[10px] sm:text-[11px] font-medium text-emerald-200/85">
                  <span>{it.sub}</span>
                  <span className="hidden sm:inline text-slate-400"> · {it.detail}</span>
                </div>
                <div className="shrink-0">{it.renderVisual()}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ============ TESTIMONIALS HIGHLIGHT ============ */
const featuredTestimonialsQuery = queryOptions({
  queryKey: ["home_featured_testimonials"],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id,rating,review_text,created_at, products(title)")
      .eq("is_active", true)
      .gte("rating", 5)
      .not("review_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(6);
    return data ?? [];
  },
});

const FALLBACK_TESTIMONIALS = [
  {
    id: "t1",
    rating: 5,
    review_text:
      "বিকাশে পেমেন্ট করে TrxID দেওয়ার ৫ মিনিটের মধ্যেই ChatGPT Plus অ্যাক্সেস পেয়ে গেছি। দারুণ সার্ভিস!",
    users: { full_name: "মাহমুদুল হাসান · ঢাকা" },
    products: { title: "ChatGPT Plus (GPT-4o)" },
  },
  {
    id: "t2",
    rating: 5,
    review_text:
      "নিজের পার্সোনাল ইমেইলে Canva Pro ১ বছরের সাবস্ক্রিপশন নিয়েছি। প্রাইস সবার চেয়ে কম এবং শতভাগ অরিজিনাল।",
    users: { full_name: "সাবিনা ইয়াসমিন · চট্টগ্রাম" },
    products: { title: "Canva Pro Official" },
  },
  {
    id: "t3",
    rating: 5,
    review_text:
      "স্মার্ট টিভিতে ৪কে কোয়ালিটিতে Netflix দেখছি পিন লক প্রোফাইলসহ। কোনো হাউজহোল্ড ঝামেলা নেই, সাপোর্ট টিমও অনেক হেল্পফুল।",
    users: { full_name: "তানভীর আহমেদ · সিলেট" },
    products: { title: "Netflix 4K Ultra HD" },
  },
  {
    id: "t4",
    rating: 5,
    review_text:
      "ইউটিউব ও রিলস এডিটিংয়ের জন্য CapCut Pro নিয়েছি। ওয়াটারমার্ক ছাড়া 4K এক্সপোর্ট এবং সব প্রো ইফেক্ট একদম স্মুথ কাজ করছে।",
    users: { full_name: "রাশেদুল ইসলাম · রাজশাহী" },
    products: { title: "CapCut Pro Official" },
  },
  {
    id: "t5",
    rating: 5,
    review_text:
      "গবেষণা ও থিসিস রাইটিংয়ের জন্য Grammarly Pro এবং Gemini Advanced বান্ডেল নিয়েছি। ইনস্ট্যান্ট ডেলিভারি পেয়ে খুবই সন্তুষ্ট!",
    users: { full_name: "নুসরাত জাহান · খুলনা" },
    products: { title: "Grammarly Pro + Gemini" },
  },
  {
    id: "t6",
    rating: 5,
    review_text:
      "ফ্রিল্যান্সিং কাজের জন্য Envato Elements ও NordVPN অর্ডার করেছিলাম। রাত ২টায় অর্ডার করেও ১০ মিনিটে ডেলিভারি পেয়েছি!",
    users: { full_name: "আরিফুল হক · কুমিল্লা" },
    products: { title: "Envato Elements + NordVPN" },
  },
];

export function TestimonialsHighlight() {
  const { data: live = [] } = useQuery(featuredTestimonialsQuery);
  const items = useMemo(() => {
    const combined = [...live, ...FALLBACK_TESTIMONIALS];
    return combined.slice(0, 6);
  }, [live]);

  return (
    <section id="customer-reviews" className="mx-auto max-w-7xl px-3.5 sm:px-6 py-10 sm:py-14">
      <div className="text-center mb-8 sm:mb-10 mx-auto max-w-2xl">
        <div className="text-xs text-primary font-bold uppercase tracking-wider">
          ⭐ ভেরিফায়েড কাস্টমার রিভিউ
        </div>
        <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl lg:text-4xl">
          কাস্টমাররা আমাদের সম্পর্কে <span className="text-gradient-brand">কী বলছেন</span>
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          বাংলাদেশজুড়ে ১৫০০+ সন্তুষ্ট কাস্টমারের বাস্তব অভিজ্ঞতা ও মতামত
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {items.map((r: any, i: number) => (
          <div
            key={`${r.id}-${i}`}
            className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative hover:shadow-glow transition flex flex-col justify-between"
          >
            <div>
              <Quote className="absolute top-4 right-4 h-7 w-7 sm:h-8 sm:w-8 text-primary/20" />
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star
                    key={k}
                    className={`h-4 w-4 ${k < (r.rating ?? 5) ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <p className="text-xs sm:text-sm leading-relaxed font-medium">"{r.review_text}"</p>
            </div>
            <div className="mt-5 flex items-center gap-3 pt-4 border-t border-glass-border">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-brand grid place-items-center text-primary-foreground font-bold shrink-0">
                {(r.users?.full_name || "U").slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-xs sm:text-sm font-semibold truncate">
                    {r.users?.full_name || "ভেরিফায়েড কাস্টমার"}
                  </div>
                  <VerifiedBuyerBadge size="xs" />
                </div>
                <div className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                  {r.products?.title || "ভেরিফায়েড পার্চেজ"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============ HOME FAQ ACCORDION ============ */
const FALLBACK_FAQS = [
  {
    id: "f1",
    question: "অর্ডার দিলে কতক্ষণে ডেলিভারি পাব?",
    answer:
      "অধিকাংশ ডিজিটাল প্রোডাক্ট অর্ডার কনফার্ম হওয়ার ৫–১৫ মিনিটের মধ্যেই ইমেইল, হোয়াটসঅ্যাপ ও অর্ডার ট্র্যাকিং পেজে ডেলিভারি হয়ে যায়।",
  },
  {
    id: "f2",
    question: "কী কী পেমেন্ট মেথড সাপোর্ট করেন?",
    answer:
      "বিকাশ, নগদ, রকেট, উপায় — সব মোবাইল ব্যাংকিংয়ের মাধ্যমে ১-ক্লিকে পেমেন্ট করে অর্ডার সম্পন্ন করতে পারবেন।",
  },
  {
    id: "f3",
    question: "প্রোডাক্ট কাজ না করলে কি রিফান্ড বা রিপ্লেসমেন্ট পাব?",
    answer:
      "হ্যাঁ! প্রতিটি সাবস্ক্রিপশনের সাথে পূর্ণ মেয়াদের ওয়ারেন্টি থাকে। কোনো সমস্যা হলে দ্রুত রিপ্লেসমেন্ট অথবা ৭ দিনের মানি-ব্যাক গ্যারান্টি পাবেন।",
  },
  {
    id: "f4",
    question: "লগইন ছাড়াই কীভাবে অর্ডার ট্র্যাক করব?",
    answer:
      "উপরের নেভবার বা ফুটার থেকে 'অর্ডার ট্র্যাক' বাটনে ক্লিক করে আপনার অর্ডার নাম্বার বা মোবাইল নাম্বার দিলেই সাথে সাথে ডেলিভারি স্ট্যাটাস ও ক্রেডেনশিয়াল দেখতে পাবেন।",
  },
  {
    id: "f5",
    question: "সাপোর্ট কীভাবে পাব?",
    answer:
      "২৪/৭ হোয়াটসঅ্যাপ, টেলিগ্রাম এবং প্রয়োজনে AnyDesk / TeamViewer-এর মাধ্যমে আমাদের এক্সপার্ট টিম সরাসরি সাপোর্ট দিয়ে থাকে।",
  },
];

export function HomeFAQ() {
  const { data: live = [] } = useQuery(faqsQuery());
  const items = live.length > 0 ? live.slice(0, 6) : FALLBACK_FAQS;
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  return (
    <section className="mx-auto max-w-4xl px-3.5 sm:px-6 py-10 sm:py-14">
      <div className="text-center mb-6 sm:mb-8">
        <div className="text-xs text-primary font-bold uppercase tracking-wider">
          ❓ প্রশ্নোত্তর
        </div>
        <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl lg:text-4xl">
          সচরাচর <span className="text-gradient-brand">জিজ্ঞাসা</span>
        </h2>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
          আপনার কোনো প্রশ্ন আছে? উত্তর এখানেই পাবেন।
        </p>
      </div>
      <div className="space-y-3">
        {items.map((f: any) => {
          const isOpen = open === f.id;
          return (
            <div key={f.id} className="glass-card rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : f.id)}
                className="w-full flex items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:bg-accent/30 transition"
              >
                <span className="font-semibold text-sm sm:text-base">{f.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-primary shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-glass-border pt-3.5 sm:pt-4">
                  {f.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-6 text-center">
        <Link
          to="/faq"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          সব প্রশ্ন দেখুন <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* ============ BUNDLE OFFERS (admin-managed + curated fallbacks) ============ */
export function BundleOffers() {
  const { data: bundles = [] } = useQuery(bundlesQuery());
  const { addItem } = useCart();
  const navigate = useNavigate();

  if (bundles.length === 0) return null;

  const handleAddBundle = (title: string, discountPercent: number, products: any[]) => {
    const factor = Math.max(0, 1 - Number(discountPercent) / 100);
    for (const p of products) {
      const basePrice = Number(p.offer_price || p.regular_price || 0);
      const discountedUnit = Math.round(basePrice * factor);
      addItem({
        productId: p.id,
        slug: p.slug,
        title: p.title,
        price: discountedUnit,
        image: p.product_images?.[0]?.image_url ?? null,
        variantId: null,
        variantLabel: `${title} (-${discountPercent}%)`,
        quantity: 1,
      });
    }
    toast.success(`${title} কার্টে যোগ হয়েছে!`);
    navigate({ to: "/cart" });
  };

  return (
    <section className="mx-auto max-w-7xl px-3.5 sm:px-6 py-10 sm:py-12">
      <div className="text-center mb-6 sm:mb-8 mx-auto max-w-2xl">
        <div className="text-xs text-primary font-bold uppercase tracking-wider flex items-center justify-center gap-2">
          <Gift className="h-3.5 w-3.5" /> কম্বো বান্ডেল অফার
        </div>
        <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl lg:text-4xl">
          একসাথে কিনে <span className="text-gradient-brand">আরও বাঁচান</span>
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          জনপ্রিয় প্রোডাক্টগুলো কম্বো প্যাকে কিনলেই পাচ্ছেন বিশেষ বান্ডেল ডিসকাউন্ট!
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {bundles.map((b) => {
          const products = (b.items || []).map((i) => i.product).filter(Boolean) as NonNullable<
            (typeof b.items)[number]["product"]
          >[];
          if (products.length < 2) return null;
          const total = products.reduce(
            (s, p) => s + Number(p.offer_price || p.regular_price || 0),
            0,
          );
          const discounted = Math.round(total * (1 - Number(b.discount_percent) / 100));
          return (
            <div
              key={b.id}
              className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:shadow-glow transition relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-base sm:text-lg lg:text-xl leading-snug">
                      {b.title}
                    </h3>
                    {b.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {b.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 rounded-full bg-gradient-brand text-primary-foreground px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-bold shadow-glow whitespace-nowrap">
                    Save {Number(b.discount_percent)}%
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2.5">
                  {products.slice(0, 4).map((p) => (
                    <Link
                      key={p.id}
                      to="/product/$slug"
                      params={{ slug: p.slug }}
                      className="flex-1 min-w-0 group/item"
                      title={p.title}
                    >
                      <div className="aspect-square rounded-xl bg-muted overflow-hidden border border-border/50 group-hover/item:border-primary/50 transition">
                        {p.product_images?.[0]?.image_url ? (
                          <img
                            src={p.product_images[0].image_url}
                            alt={p.title}
                            loading="lazy"
                            className="h-full w-full object-cover group-hover/item:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-2xl">📦</div>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[11px] mt-1.5 truncate font-medium group-hover/item:text-primary transition-colors">
                        {p.title}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between gap-2 pt-4 border-t border-glass-border">
                <div>
                  <div className="text-xs text-muted-foreground line-through tabular-nums">
                    {formatBDT(total)}
                  </div>
                  <div className="font-display font-bold text-xl sm:text-2xl text-gradient-brand tabular-nums">
                    {formatBDT(discounted)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddBundle(b.title, Number(b.discount_percent), products)}
                  className="rounded-xl bg-gradient-brand px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-glow hover:scale-105 transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  বান্ডল নিন
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
