export interface CategoryInput {
  id: string;
  slug: string;
  name: string;
  name_en?: string | null;
  icon_url?: string | null;
  sort_order?: number | null;
}

export interface ExplorerProductVariant {
  regular_price?: number | null;
  offer_price?: number | null;
  is_active?: boolean | null;
  stock_quantity?: number | null;
}

export interface ExplorerProductImage {
  image_url: string;
  is_main?: boolean | null;
  sort_order?: number | null;
}

export interface ExplorerProductInput {
  id: string;
  slug: string;
  title: string;
  title_en?: string | null;
  short_description?: string | null;
  short_description_en?: string | null;
  regular_price?: number | null;
  offer_price?: number | null;
  average_rating?: number | null;
  total_sales?: number | null;
  total_reviews?: number | null;
  is_featured?: boolean | null;
  is_new_arrival?: boolean | null;
  is_best_seller?: boolean | null;
  is_variant?: boolean | null;
  category_id?: string | null;
  product_images?: ExplorerProductImage[] | null;
  product_variants?: ExplorerProductVariant[] | null;
}

export type CategoryIconKey = "bot" | "palette" | "tv" | "cpu" | "shield" | "sparkles";

export interface CategoryThemePreset {
  iconKey: CategoryIconKey;
  taglineBn: string;
  taglineEn: string;
  featuredTools: string[];
  accentHex: string;
  glowCss: string;
  borderActiveClass: string;
  iconBgClass: string;
  deliveryInfoBn: string;
}

export interface EnrichedCategory extends CategoryInput {
  indexLabel: string;
  iconKey: CategoryIconKey;
  taglineBn: string;
  taglineEn: string;
  featuredTools: string[];
  featuredToolsLine: string;
  accentHex: string;
  glowCss: string;
  borderActiveClass: string;
  iconBgClass: string;
  deliveryInfoBn: string;
  productCount: number;
  minPrice: number | null;
  maxDiscountPercent: number;
  totalCategorySales: number;
  products: ExplorerProductInput[];
}

const SLUG_PRESETS: Record<string, CategoryThemePreset> = {
  "ai-tools": {
    iconKey: "bot",
    taglineBn: "প্রোডাক্টিভিটি, কোডিং ও রিসার্চের সেরা প্রিমিয়াম AI সাবস্ক্রিপশন",
    taglineEn: "Premium AI Assistants for Coding, Research & Productivity",
    featuredTools: ["ChatGPT Plus", "Gemini Advanced", "Perplexity Pro"],
    accentHex: "#8B5CF6",
    glowCss:
      "radial-gradient(circle at 85% 15%, rgba(139, 92, 246, 0.24), rgba(6, 182, 212, 0.06) 60%, transparent 80%)",
    borderActiveClass: "border-violet-500/60 shadow-[0_0_30px_-8px_rgba(139,92,246,0.45)]",
    iconBgClass:
      "from-violet-500/25 via-purple-500/15 to-cyan-500/10 text-violet-300 border-violet-500/35",
    deliveryInfoBn: "৫–১০ মিনিটে ফুল ওয়ারেন্টিসহ ডেলিভারি",
  },
  "design-video-editing": {
    iconKey: "palette",
    taglineBn: "গ্রাফিক ডিজাইন, 4K ভিডিও এডিটিং ও আনলিমিটেড ক্রিয়েটিভ অ্যাসেট",
    taglineEn: "Graphic Design, 4K Video Editing & Unlimited Creative Assets",
    featuredTools: ["Canva Pro", "CapCut Pro", "Envato Elements"],
    accentHex: "#EC4899",
    glowCss:
      "radial-gradient(circle at 85% 15%, rgba(236, 72, 153, 0.22), rgba(139, 92, 246, 0.06) 60%, transparent 80%)",
    borderActiveClass: "border-pink-500/60 shadow-[0_0_30px_-8px_rgba(236,72,153,0.45)]",
    iconBgClass:
      "from-pink-500/25 via-rose-500/15 to-purple-500/10 text-pink-300 border-pink-500/35",
    deliveryInfoBn: "নিজস্ব ইমেইলে তাৎক্ষণিক অ্যাক্টিভেশন",
  },
  "streaming-entertainment": {
    iconKey: "tv",
    taglineBn: "বলিউড, হলিউড ও লাইভ স্পোর্টসের আল্ট্রা এইচডি স্ট্রিমিং প্রোফাইল",
    taglineEn: "4K Ultra HD Movies, Originals & Live Sports Streaming",
    featuredTools: ["Netflix 4K UHD", "Prime Video", "Spotify Premium"],
    accentHex: "#F43F5E",
    glowCss:
      "radial-gradient(circle at 85% 15%, rgba(244, 63, 94, 0.22), rgba(249, 115, 22, 0.06) 60%, transparent 80%)",
    borderActiveClass: "border-rose-500/60 shadow-[0_0_30px_-8px_rgba(244,63,94,0.45)]",
    iconBgClass: "from-rose-500/25 via-red-500/15 to-amber-500/10 text-rose-300 border-rose-500/35",
    deliveryInfoBn: "পিন-লকড প্রাইভেট প্রোফাইল ও অটো রিনিউ",
  },
  "software-productivity": {
    iconKey: "cpu",
    taglineBn: "থিসিস, একাডেমিক রাইটিং, প্লেজিয়ারিজম চেক ও অফিস সফটওয়্যার",
    taglineEn: "Academic Writing, Plagiarism Check & Office Productivity",
    featuredTools: ["Grammarly Premium", "QuillBot", "Office 365"],
    accentHex: "#10B981",
    glowCss:
      "radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.22), rgba(6, 182, 212, 0.06) 60%, transparent 80%)",
    borderActiveClass: "border-emerald-500/60 shadow-[0_0_30px_-8px_rgba(16,185,129,0.45)]",
    iconBgClass:
      "from-emerald-500/25 via-teal-500/15 to-cyan-500/10 text-emerald-300 border-emerald-500/35",
    deliveryInfoBn: "স্টুডেন্ট ও ফ্রিল্যান্সারদের ১ নম্বর পছন্দ",
  },
  "vpn-security": {
    iconKey: "shield",
    taglineBn: "হাই-স্পিড গ্লোবাল সার্ভার, ডেটা প্রাইভেসি ও সাইবার প্রোটেকশন",
    taglineEn: "High-Speed Global VPN Servers & Cyber Security Protection",
    featuredTools: ["NordVPN Premium", "ExpressVPN", "Surfshark"],
    accentHex: "#06B6D4",
    glowCss:
      "radial-gradient(circle at 85% 15%, rgba(6, 182, 212, 0.24), rgba(59, 130, 246, 0.06) 60%, transparent 80%)",
    borderActiveClass: "border-cyan-500/60 shadow-[0_0_30px_-8px_rgba(6,182,212,0.45)]",
    iconBgClass: "from-cyan-500/25 via-sky-500/15 to-blue-500/10 text-cyan-300 border-cyan-500/35",
    deliveryInfoBn: "মাল্টি-ডিভাইস সাপোর্ট ও ১০০% আপটাইম",
  },
};

const FALLBACK_PRESETS: CategoryThemePreset[] = [
  SLUG_PRESETS["ai-tools"],
  SLUG_PRESETS["design-video-editing"],
  SLUG_PRESETS["streaming-entertainment"],
  SLUG_PRESETS["software-productivity"],
  SLUG_PRESETS["vpn-security"],
];

export function resolveCategoryTheme(category: CategoryInput, index: number): CategoryThemePreset {
  const slugLower = (category.slug || "").toLowerCase();
  if (SLUG_PRESETS[slugLower]) {
    return SLUG_PRESETS[slugLower];
  }

  const combinedText = `${slugLower} ${(category.name || "").toLowerCase()} ${(category.name_en || "").toLowerCase()}`;
  if (
    combinedText.includes("stream") ||
    combinedText.includes("netflix") ||
    combinedText.includes("স্ট্রিমিং") ||
    combinedText.includes("এন্টারটেইনমেন্ট") ||
    combinedText.includes("entertainment")
  ) {
    return SLUG_PRESETS["streaming-entertainment"];
  }
  if (
    combinedText.includes("design") ||
    combinedText.includes("video") ||
    combinedText.includes("ডিজাইন") ||
    combinedText.includes("এডিটিং")
  ) {
    return SLUG_PRESETS["design-video-editing"];
  }
  if (
    combinedText.includes("vpn") ||
    combinedText.includes("security") ||
    combinedText.includes("ভিপিএন") ||
    combinedText.includes("সিকিউরিটি")
  ) {
    return SLUG_PRESETS["vpn-security"];
  }
  if (
    combinedText.includes("software") ||
    combinedText.includes("সফটওয়্যার") ||
    combinedText.includes("রাইটিং") ||
    combinedText.includes("writing")
  ) {
    return SLUG_PRESETS["software-productivity"];
  }
  if (
    /\bai\b/.test(combinedText) ||
    combinedText.includes("gpt") ||
    combinedText.includes("gemini") ||
    combinedText.includes("bot") ||
    combinedText.includes("টুলস ও অ্যাসিস্ট্যান্ট")
  ) {
    return SLUG_PRESETS["ai-tools"];
  }

  const fallback = FALLBACK_PRESETS[index % FALLBACK_PRESETS.length];
  return {
    ...fallback,
    iconKey: "sparkles",
    taglineBn: "ভেরিফায়েড প্রিমিয়াম ডিজিটাল সাবস্ক্রিপশন ও ফুল সাপোর্ট",
    taglineEn: "Verified Premium Digital Subscriptions & Full Support",
    featuredTools: ["Instant Access", "Official Warranty", "24/7 Support"],
  };
}

export function getEffectiveProductPrice(product: ExplorerProductInput): {
  effectivePrice: number;
  regularPrice: number;
  discountPercent: number;
} {
  const activeVariants = (product.product_variants || []).filter((v) => v.is_active !== false);
  if (product.is_variant && activeVariants.length > 0) {
    let bestEffective = Infinity;
    let bestRegular = 0;
    let maxDiscount = 0;

    for (const v of activeVariants) {
      const reg = Number(v.regular_price ?? 0);
      const off = v.offer_price != null && Number(v.offer_price) > 0 ? Number(v.offer_price) : reg;
      if (off > 0 && off < bestEffective) {
        bestEffective = off;
        bestRegular = reg > off ? reg : off;
      }
      if (reg > 0 && off > 0 && reg > off) {
        const disc = Math.round(((reg - off) / reg) * 100);
        if (disc > maxDiscount) maxDiscount = disc;
      }
    }

    if (bestEffective !== Infinity) {
      return {
        effectivePrice: bestEffective,
        regularPrice: bestRegular,
        discountPercent: maxDiscount,
      };
    }
  }

  const reg = Number(product.regular_price ?? 0);
  const off =
    product.offer_price != null && Number(product.offer_price) > 0
      ? Number(product.offer_price)
      : reg;
  const discountPercent =
    reg > 0 && off > 0 && reg > off ? Math.round(((reg - off) / reg) * 100) : 0;

  return {
    effectivePrice: off > 0 ? off : reg,
    regularPrice: reg > off ? reg : off,
    discountPercent,
  };
}

export function enrichCategoriesWithProducts(
  categories: CategoryInput[],
  products: ExplorerProductInput[],
): EnrichedCategory[] {
  return categories.map((cat, idx) => {
    const preset = resolveCategoryTheme(cat, idx);
    const matchingProducts = products.filter((p) => p.category_id === cat.id);

    let minPrice: number | null = null;
    let maxDiscountPercent = 0;
    let totalCategorySales = 0;

    for (const prod of matchingProducts) {
      const { effectivePrice, discountPercent } = getEffectiveProductPrice(prod);
      if (effectivePrice > 0 && (minPrice === null || effectivePrice < minPrice)) {
        minPrice = effectivePrice;
      }
      if (discountPercent > maxDiscountPercent) {
        maxDiscountPercent = discountPercent;
      }
      totalCategorySales += Number(prod.total_sales ?? 0);
    }

    // If actual products exist, derive concise featured tool names from real product titles
    const dynamicToolNames = matchingProducts
      .slice(0, 3)
      .map((p) => shortenToolTitle(p.title_en || p.title || ""))
      .filter(Boolean);

    const featuredTools = dynamicToolNames.length > 0 ? dynamicToolNames : preset.featuredTools;

    return {
      ...cat,
      indexLabel: String(idx + 1).padStart(2, "0"),
      iconKey: preset.iconKey,
      taglineBn: preset.taglineBn,
      taglineEn: preset.taglineEn,
      featuredTools,
      featuredToolsLine: featuredTools.join(" · "),
      accentHex: preset.accentHex,
      glowCss: preset.glowCss,
      borderActiveClass: preset.borderActiveClass,
      iconBgClass: preset.iconBgClass,
      deliveryInfoBn: preset.deliveryInfoBn,
      productCount: matchingProducts.length,
      minPrice,
      maxDiscountPercent,
      totalCategorySales,
      products: matchingProducts,
    };
  });
}

export function filterExplorerProducts(
  enrichedCategories: EnrichedCategory[],
  allProducts: ExplorerProductInput[],
  activeCategorySlug: string,
  searchQuery: string,
): ExplorerProductInput[] {
  let pool: ExplorerProductInput[] = allProducts;

  if (activeCategorySlug && activeCategorySlug !== "all") {
    const matchedCat = enrichedCategories.find((c) => c.slug === activeCategorySlug);
    pool = matchedCat ? matchedCat.products : [];
  }

  const trimmed = searchQuery.trim().toLowerCase();
  if (!trimmed) {
    return pool;
  }

  return pool.filter((p) => {
    const titleBn = (p.title || "").toLowerCase();
    const titleEn = (p.title_en || "").toLowerCase();
    const descBn = (p.short_description || "").toLowerCase();
    const descEn = (p.short_description_en || "").toLowerCase();
    return (
      titleBn.includes(trimmed) ||
      titleEn.includes(trimmed) ||
      descBn.includes(trimmed) ||
      descEn.includes(trimmed)
    );
  });
}

export function shortenToolTitle(rawTitle: string): string {
  return rawTitle
    .split("—")[0]
    .split("(")[0]
    .replace(
      /\b(Official Access|Official Subscription|Private Profile|Premium Subscription|High-Speed Subscription|Unlimited Downloads)\b/gi,
      "",
    )
    .replace(/\+\s*2TB Google One/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatBDT(amount: number | null | undefined): string {
  const num = Number(amount ?? 0);
  if (!Number.isFinite(num)) return "৳0";
  return `৳${num.toLocaleString("en-IN")}`;
}

export interface InfiniteScrollStepInput {
  currentScrollLeft: number;
  totalScrollWidth: number;
  copiesCount: number;
  deltaPx: number;
}

/**
 * Computes the next scrollLeft position for a seamless right-to-left infinite marquee.
 * Wraps seamlessly by one set width when crossing set boundaries so cards loop endlessly.
 */
export function computeInfiniteScrollStep(input: InfiniteScrollStepInput): number {
  const { currentScrollLeft, totalScrollWidth, copiesCount, deltaPx } = input;
  if (copiesCount <= 1 || totalScrollWidth <= 0) {
    return Math.max(0, currentScrollLeft + deltaPx);
  }
  const singleSetWidth = totalScrollWidth / copiesCount;
  if (singleSetWidth <= 0) {
    return Math.max(0, currentScrollLeft + deltaPx);
  }

  let next = currentScrollLeft + deltaPx;
  const upperThreshold = copiesCount >= 3 ? singleSetWidth * 2 : singleSetWidth;

  if (next >= upperThreshold) {
    next -= singleSetWidth;
  } else if (next < 0) {
    next += singleSetWidth;
  }

  return next;
}
