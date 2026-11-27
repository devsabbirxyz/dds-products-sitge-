import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Zap,
  ArrowRight,
  Mail,
  CheckCircle2,
  ShoppingBag,
  Smartphone,
  PackageSearch,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { productsQuery, blogPostsQuery, categoriesQuery } from "@/lib/storefront";
import {
  siteSettingsQuery,
  parsePromoSection,
  HOMEPAGE_KEYS,
  toYouTubeEmbed,
  offerBannerQuery,
} from "@/lib/site-settings";
import { ProductCard } from "@/components/storefront/ProductCard";
import { OfferBannerSlider } from "@/components/storefront/OfferBannerSlider";
import { CountdownBanner } from "@/components/storefront/CountdownBanner";
import { RecentlyViewed } from "@/components/storefront/RecentlyViewed";
import {
  FlashDeals,
  JustArrived,
  LiveStats,
  TestimonialsHighlight,
  HomeFAQ,
  BundleOffers,
} from "@/components/storefront/HomeSections";
import { FreeGiftBanner } from "@/components/storefront/FreeGiftBanner";
import { TrustBadgeSection, MoneyBackBanner } from "@/components/storefront/TrustBadges";
import { AdvancedCategoryExplorer } from "@/components/storefront/AdvancedCategoryExplorer";
import { CircledBrandText } from "@/components/layout/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery(offerBannerQuery);
    const firstSlide = context.queryClient.getQueryData<any>(offerBannerQuery.queryKey);
    return { firstSlide: firstSlide ?? null };
  },
  head: ({ loaderData }) => {
    const preloadLinks = loaderData?.firstSlide?.image_url
      ? [
          {
            rel: "preload",
            as: "image",
            href: loaderData.firstSlide.image_url,
            fetchPriority: "high" as const,
          },
        ]
      : [];
    return {
      meta: [
        { title: "DDS-Digital — Bangladesh's #1 Digital Product Store" },
        {
          name: "description",
          content:
            "DDS-Digital (Dev Sabbir Soft) — বাংলাদেশের ১ নম্বর ডিজিটাল প্রোডাক্ট মার্কেটপ্লেস। সাবস্ক্রিপশন, সফটওয়্যার, অ্যাকাউন্ট সবকিছু এক জায়গায়।",
        },
        { property: "og:title", content: "DDS-Digital — Bangladesh's #1 Digital Product Store" },
        {
          property: "og:description",
          content:
            "বাংলাদেশের ১ নম্বর ডিজিটাল প্রোডাক্ট সেলিং প্ল্যাটফর্ম। ইনস্ট্যান্ট ডেলিভারি, সিকিউর পেমেন্ট, ২৪/৭ সাপোর্ট।",
        },
        { property: "og:url", content: "/" },
      ],
      links: [{ rel: "canonical", href: "/" }, ...preloadLinks],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "DDS-Digital",
            alternateName: "Dev Sabbir Soft",
            description: "Bangladesh's Number 1 Digital Product Selling System",
            areaServed: "BD",
          }),
        },
      ],
    };
  },
  component: HomePage,
});

function HomePage() {
  const { t } = useI18n();
  const { data: catalogProducts = [], isLoading: productsLoading } = useQuery(
    productsQuery({ limit: 24 }),
  );
  const { data: latestPosts = [], isLoading: loadingBlog } = useQuery(blogPostsQuery(3));
  const { data: settings = {} } = useQuery(siteSettingsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery());

  const featured = catalogProducts.filter((p: any) => p.is_featured);
  const products = featured.length > 0 ? featured.slice(0, 8) : catalogProducts.slice(0, 8);
  const posts = latestPosts;

  const heroBadge = settings[HOMEPAGE_KEYS.hero_badge] || t("hero_badge");
  const heroTagline =
    settings[HOMEPAGE_KEYS.hero_tagline] ||
    `${t("tagline")} — সাবস্ক্রিপশন, সফটওয়্যার, অ্যাকাউন্ট, ডাউনলোডেবল প্রোডাক্ট সবকিছু এক জায়গায়। ইনস্ট্যান্ট অটো ডেলিভারি।`;
  const ctaPrimary = settings[HOMEPAGE_KEYS.hero_cta_primary] || t("shop_now");
  const ctaSecondary = settings[HOMEPAGE_KEYS.hero_cta_secondary] || "আরও জানুন";
  const ctaSecondaryLink = settings[HOMEPAGE_KEYS.hero_cta_secondary_link] || "/dashboard";
  const announcement =
    settings[HOMEPAGE_KEYS.announcement] ||
    "🎉 লঞ্চিং অফার — প্রথম ১০০ অর্ডারে ১৫% ছাড়, কুপন কোড: DDS15";

  const customVideoRaw = (settings[HOMEPAGE_KEYS.how_to_buy_video] || "").trim();
  const hasCustomHowToVideo = Boolean(customVideoRaw) && !customVideoRaw.includes("dQw4w9WgXcQ");

  const orderSteps = [
    {
      step: "০১",
      icon: ShoppingBag,
      title: "প্রোডাক্ট ও প্ল্যান বাছাই করুন",
      desc: "শপ থেকে আপনার পছন্দের সাবস্ক্রিপশন বা সফটওয়্যার এবং মেয়াদ সিলেক্ট করে '১-ক্লিক বাই' বাটনে ট্যাপ করুন।",
    },
    {
      step: "০২",
      icon: Smartphone,
      title: "বিকাশ / নগদ / রকেটে পেমেন্ট",
      desc: "স্ক্রিনে দেওয়া নাম্বার ১-ক্লিকে কপি করে Send Money বা Payment সম্পন্ন করুন এবং TrxID কপি করুন।",
    },
    {
      step: "০৩",
      icon: CheckCircle2,
      title: "TrxID দিয়ে অর্ডার কনফার্ম",
      desc: "আপনার নাম, মোবাইল নাম্বার ও TrxID দিয়ে সাবমিট করলেই অর্ডার কনফার্ম হবে ও সাথে সাথে PDF রিসিট পাবেন।",
    },
    {
      step: "০৪",
      icon: Zap,
      title: "৫–১৫ মিনিটে ইনস্ট্যান্ট ডেলিভারি",
      desc: "আপনার ইমেইল, হোয়াটসঅ্যাপ অথবা উপরের 'অর্ডার ট্র্যাক' বাটনে ক্লিক করেই অ্যাক্সেস বুঝে নিন।",
    },
  ];

  return (
    <>
      <CountdownBanner />
      {/* Announcement bar */}
      <div className="bg-gradient-brand text-primary-foreground text-center text-xs sm:text-sm py-2 px-4 font-medium">
        {announcement}
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-90 pointer-events-none" />
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/30 blur-[120px] pointer-events-none" />
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-secondary/30 blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-3.5 sm:px-6 pt-6 sm:pt-8 pb-10 sm:pb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3.5 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium">
            {heroBadge}
          </div>

          <h1 className="mt-3.5 sm:mt-4 mx-auto max-w-4xl font-display font-bold text-xl sm:text-3xl md:text-4xl lg:text-5xl leading-snug sm:leading-tight">
            <CircledBrandText variant="hero">DDS-Digital</CircledBrandText> —{" "}
            <span className="text-gradient-brand">
              বাংলাদেশের ১ নম্বর ডিজিটাল প্রোডাক্ট মার্কেটপ্লেস
            </span>
          </h1>

          {/* Offer banner — auto-sliding carousel */}
          <div className="relative">
            <div className="relative rounded-2xl sm:rounded-3xl shadow-glow">
              <OfferBannerSlider />
            </div>
          </div>

          <p className="mt-5 sm:mt-8 mx-auto max-w-2xl text-xs sm:text-base lg:text-lg text-muted-foreground leading-relaxed px-1">
            {heroTagline}
          </p>
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <Link
              to="/shop"
              className="rounded-xl sm:rounded-2xl bg-gradient-brand px-5 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition inline-flex items-center gap-2"
            >
              {ctaPrimary} <ArrowRight className="h-4 w-4" />
            </Link>
            {ctaSecondaryLink.startsWith("http") ? (
              <a
                href={ctaSecondaryLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl sm:rounded-2xl glass-card px-5 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold hover:bg-accent transition"
              >
                {ctaSecondary}
              </a>
            ) : (
              <Link
                to={ctaSecondaryLink as any}
                className="rounded-xl sm:rounded-2xl glass-card px-5 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold hover:bg-accent transition"
              >
                {ctaSecondary}
              </Link>
            )}
          </div>
        </div>
      </section>

      <FreeGiftBanner />
      <LiveStats />

      {/* ADVANCED INTERACTIVE CATEGORY EXPLORER */}
      <AdvancedCategoryExplorer categories={categories as any} products={catalogProducts as any} />

      <FlashDeals products={catalogProducts as any} />

      {/* FEATURED PRODUCTS */}
      <section className="mx-auto max-w-7xl px-3.5 sm:px-6 py-8 sm:py-14 lg:py-16">
        <div className="text-center mb-6 sm:mb-8 mx-auto max-w-2xl">
          <div className="text-xs text-primary font-bold uppercase tracking-wider">
            ⭐ ফিচারড কালেকশন
          </div>
          <h2 className="mt-1.5 font-display font-bold text-2xl sm:text-3xl lg:text-4xl">
            সেরা <span className="text-gradient-brand">প্রোডাক্টসমূহ</span>
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
            আমাদের সবচেয়ে জনপ্রিয় ও ভেরিফায়েড প্রিমিয়াম ডিজিটাল প্রোডাক্টসমূহ দেখুন।
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
          {productsLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl overflow-hidden">
                <div className="aspect-square w-full bg-white/5 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-white/10 rounded animate-pulse" />
                  <div className="h-8 w-full bg-white/10 rounded animate-pulse mt-3" />
                </div>
              </div>
            ))
          ) : products.length > 0 ? (
            products.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)
          ) : (
            <div className="col-span-full glass-card rounded-2xl p-10 text-center">
              <div className="text-4xl mb-3">📦</div>
              <h3 className="font-display font-bold text-lg">এখনো কোনো প্রোডাক্ট নেই</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Admin Panel → Products থেকে নতুন প্রোডাক্ট যোগ করুন।
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            সব দেখুন <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <JustArrived products={catalogProducts as any} />
      <RecentlyViewed />

      {/* SPECIAL OFFER */}
      {(() => {
        const promo = parsePromoSection(settings[HOMEPAGE_KEYS.promo_section]);
        if (!promo.enabled) return null;
        const descParts = promo.description.split("{coupon}");
        return (
          <section className="mx-auto max-w-7xl px-3.5 sm:px-6 pb-10 sm:pb-14">
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-brand p-5 sm:p-8 lg:p-12 text-primary-foreground">
              <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
              <div className="relative grid md:grid-cols-2 gap-6 items-center">
                <div>
                  {promo.badge && (
                    <div className="inline-block rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-bold mb-3">
                      {promo.badge}
                    </div>
                  )}
                  <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                    {promo.heading}
                  </h2>
                  {promo.description && (
                    <p className="mt-2.5 sm:mt-3 opacity-90 text-xs sm:text-sm lg:text-base leading-relaxed">
                      {descParts[0]}
                      {descParts.length > 1 && promo.coupon_code && (
                        <span className="font-bold bg-white/20 px-2 py-0.5 rounded">
                          {promo.coupon_code}
                        </span>
                      )}
                      {descParts.slice(1).join("{coupon}")}
                    </p>
                  )}
                  {promo.button_text && (
                    <Link
                      to={promo.button_link || "/shop"}
                      className="mt-5 sm:mt-6 inline-block rounded-xl sm:rounded-2xl bg-white text-primary px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold hover:scale-105 transition"
                    >
                      {promo.button_text}
                    </Link>
                  )}
                </div>
                {promo.stats.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                    {promo.stats.slice(0, 3).map((s, i) => (
                      <div
                        key={i}
                        className="rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur p-2.5 sm:p-4"
                      >
                        <div className="font-display font-bold text-lg sm:text-2xl lg:text-3xl tabular-nums">
                          {s.value}
                        </div>
                        <div className="text-[10px] sm:text-xs opacity-90 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })()}

      <BundleOffers />
      <MoneyBackBanner />
      <TrustBadgeSection />

      {/* HOW TO BUY — 4-Step Visual Order Guide (+ optional custom video) */}
      <section id="how-to-buy" className="mx-auto max-w-7xl px-3.5 sm:px-6 py-10 sm:py-14">
        <div className="text-center mb-8 sm:mb-10 mx-auto max-w-2xl">
          <div className="text-xs text-primary font-bold uppercase tracking-wider">
            🛒 সহজ অর্ডার প্রক্রিয়া
          </div>
          <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl lg:text-4xl">
            কীভাবে <span className="text-gradient-brand">অর্ডার করবেন?</span>
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
            মাত্র ৪টি সহজ ধাপে বিকাশ, নগদ বা রকেটের মাধ্যমে পেমেন্ট করে ৫–১৫ মিনিটে ডেলিভারি নিন।
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {orderSteps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative overflow-hidden hover:shadow-glow hover:-translate-y-0.5 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-display font-bold text-2xl sm:text-3xl text-primary/25 tabular-nums">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-base sm:text-lg leading-snug">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/shop"
            className="rounded-xl sm:rounded-2xl bg-gradient-brand px-5 sm:px-6 py-3 text-xs sm:text-sm font-bold text-primary-foreground shadow-glow hover:scale-105 transition inline-flex items-center gap-2"
          >
            এখনই প্রোডাক্ট দেখুন <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("dds:open-track-order"))}
            className="rounded-xl sm:rounded-2xl glass-card px-5 sm:px-6 py-3 text-xs sm:text-sm font-semibold hover:bg-accent transition inline-flex items-center gap-2"
          >
            <PackageSearch className="h-4 w-4 text-primary" /> অর্ডার ট্র্যাক করুন
          </button>
        </div>

        {hasCustomHowToVideo && (
          <div className="mt-8 mx-auto max-w-4xl glass-card rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-glow">
            <div className="aspect-video w-full overflow-hidden rounded-xl sm:rounded-2xl bg-black">
              <iframe
                src={toYouTubeEmbed(customVideoRaw)}
                title="How to Buy"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        )}
      </section>

      <TestimonialsHighlight />
      <HomeFAQ />

      {/* NEWSLETTER */}
      {settings[HOMEPAGE_KEYS.newsletter_enabled] !== "false" && (
        <section className="mx-auto max-w-4xl px-3.5 sm:px-6 pb-12 sm:pb-16">
          <Newsletter
            heading={settings[HOMEPAGE_KEYS.newsletter_heading]}
            sub={settings[HOMEPAGE_KEYS.newsletter_sub]}
          />
        </section>
      )}

      {/* BLOG */}
      <section className="mx-auto max-w-7xl px-3.5 sm:px-6 pb-16 sm:pb-20">
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <div className="text-xs text-primary font-bold uppercase tracking-wider">
              📝 ব্লগ ও গাইড
            </div>
            <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl lg:text-4xl">
              ডিজিটাল প্রোডাক্ট <span className="text-gradient-brand">টিপস ও গাইড</span>
            </h2>
          </div>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:underline whitespace-nowrap"
          >
            সব আর্টিকেল <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {loadingBlog
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl overflow-hidden">
                  <div className="aspect-video w-full bg-white/5 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              ))
            : posts.slice(0, 3).map((p: any) => (
                <Link
                  key={p.id}
                  to="/blog/$slug"
                  params={{ slug: p.slug }}
                  className="group glass-card rounded-2xl overflow-hidden hover:shadow-glow transition flex flex-col"
                >
                  <div className="aspect-[12/5] w-full bg-gradient-glow grid place-items-center overflow-hidden">
                    {p.thumbnail_url ? (
                      <img
                        src={p.thumbnail_url}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="text-5xl font-display font-bold text-gradient-brand opacity-25">
                        {p.title.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    {p.category && (
                      <div className="text-[11px] font-semibold text-primary mb-1.5">
                        {p.category}
                      </div>
                    )}
                    <h3 className="font-bold text-sm sm:text-base line-clamp-2 group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    {p.short_description && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {p.short_description}
                      </p>
                    )}
                    <span className="mt-4 pt-3 border-t border-border/50 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                      বিস্তারিত পড়ুন <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
        </div>
      </section>
    </>
  );
}

function Newsletter({ heading, sub }: { heading?: string; sub?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("err");
      setMsg("সঠিক ইমেইল দিন");
      return;
    }
    setState("loading");
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    if (error) {
      setState("err");
      setMsg(
        error.code === "23505"
          ? "এই ইমেইল ইতিমধ্যে সাবস্ক্রাইব করা আছে"
          : "সমস্যা হয়েছে — পরে চেষ্টা করুন",
      );
    } else {
      setState("ok");
      setMsg("সফলভাবে সাবস্ক্রাইব হয়েছে! 🎉");
      setEmail("");
    }
  }

  return (
    <div className="glass-card rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-glow opacity-50 pointer-events-none" />
      <div className="relative">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-brand grid place-items-center shadow-glow mb-4">
          <Mail className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="font-display font-bold text-2xl sm:text-3xl">
          {heading || "নতুন অফারের আপডেট পেতে চান?"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {sub || "আমাদের নিউজলেটার সাবস্ক্রাইব করুন — সব নতুন প্রোডাক্ট ও স্পেশাল অফার সবার আগে।"}
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="আপনার ইমেইল"
            className="flex-1 rounded-xl glass px-4 py-3 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          <button
            type="submit"
            disabled={state === "loading"}
            className="rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition disabled:opacity-60"
          >
            {state === "loading" ? "..." : "সাবস্ক্রাইব করুন"}
          </button>
        </form>
        {msg && (
          <p
            className={`mt-3 text-xs inline-flex items-center gap-1 ${state === "ok" ? "text-primary" : "text-destructive"}`}
          >
            {state === "ok" && <CheckCircle2 className="h-3 w-3" />}
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
