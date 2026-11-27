import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCategoryTheme,
  getEffectiveProductPrice,
  enrichCategoriesWithProducts,
  filterExplorerProducts,
  computeInfiniteScrollStep,
  type CategoryInput,
  type ExplorerProductInput,
} from "./category-explorer-utils";

describe("category-explorer-utils", () => {
  const sampleCategories: CategoryInput[] = [
    {
      id: "cat-ai",
      slug: "ai-tools",
      name: "AI টুলস ও অ্যাসিস্ট্যান্ট",
      name_en: "AI Tools & Assistants",
    },
    {
      id: "cat-design",
      slug: "design-video-editing",
      name: "ডিজাইন ও ভিডিও এডিটিং",
      name_en: "Design & Video Editing",
    },
    { id: "cat-custom", slug: "custom-gaming", name: "গেমিং টপআপ", name_en: "Gaming Topup" },
  ];

  const sampleProducts: ExplorerProductInput[] = [
    {
      id: "p1",
      slug: "chatgpt-plus",
      title: "ChatGPT Plus (GPT-4o) সাবস্ক্রিপশন",
      title_en: "ChatGPT Plus — Official Access",
      short_description: "আনলিমিটেড GPT-4o ও কোডিং সাপোর্ট",
      category_id: "cat-ai",
      regular_price: 2500,
      offer_price: 499,
      is_variant: true,
      total_sales: 140,
      product_variants: [
        { regular_price: 800, offer_price: 399, is_active: true },
        { regular_price: 2500, offer_price: 499, is_active: true },
      ],
    },
    {
      id: "p2",
      slug: "gemini-advanced",
      title: "Google Gemini Advanced + 2TB",
      title_en: "Gemini Advanced (1 Month)",
      short_description: "গুগল ওয়ান ২ টেরাবাইট স্টোরেজসহ",
      category_id: "cat-ai",
      regular_price: 1200,
      offer_price: 299,
      is_variant: false,
      total_sales: 85,
    },
    {
      id: "p3",
      slug: "canva-pro",
      title: "Canva Pro এডুকেশন ও টিম সাবস্ক্রিপশন",
      title_en: "Canva Pro Subscription",
      short_description: "প্রিমিয়াম টেমপ্লেট ও ব্র্যান্ড কিট",
      category_id: "cat-design",
      regular_price: 500,
      offer_price: 99,
      is_variant: false,
      total_sales: 310,
    },
  ];

  it("resolves domain-specific themes and falls back gracefully for custom categories", () => {
    const aiTheme = resolveCategoryTheme(sampleCategories[0], 0);
    assert.equal(aiTheme.iconKey, "bot");
    assert.ok(aiTheme.featuredTools.includes("ChatGPT Plus"));

    const customTheme = resolveCategoryTheme(sampleCategories[2], 2);
    assert.equal(customTheme.iconKey, "sparkles");
    assert.ok(customTheme.taglineBn.length > 0);

    const streamingTheme = resolveCategoryTheme(
      {
        id: "cat-stream",
        slug: "streaming",
        name: "স্ট্রিমিং ও এন্টারটেইনমেন্ট",
        name_en: "Streaming & Entertainment",
      },
      2,
    );
    assert.equal(streamingTheme.iconKey, "tv");
  });

  it("computes lowest effective price and highest discount across variants", () => {
    const priceStats = getEffectiveProductPrice(sampleProducts[0]);
    assert.equal(priceStats.effectivePrice, 399);
    assert.equal(priceStats.regularPrice, 800);
    assert.equal(priceStats.discountPercent, 80);
  });

  it("enriches categories with live product counts, starting prices, discounts, and dynamic tool names", () => {
    const enriched = enrichCategoriesWithProducts(sampleCategories, sampleProducts);
    assert.equal(enriched.length, 3);

    const aiCat = enriched[0];
    assert.equal(aiCat.indexLabel, "01");
    assert.equal(aiCat.productCount, 2);
    assert.equal(aiCat.minPrice, 299);
    assert.equal(aiCat.maxDiscountPercent, 80);
    assert.equal(aiCat.totalCategorySales, 225);
    assert.equal(aiCat.featuredToolsLine, "ChatGPT Plus · Gemini Advanced");

    const customCat = enriched[2];
    assert.equal(customCat.productCount, 0);
    assert.equal(customCat.minPrice, null);
    assert.equal(customCat.featuredToolsLine, "Instant Access · Official Warranty · 24/7 Support");
  });

  it("filters explorer products by active category slug and search query", () => {
    const enriched = enrichCategoriesWithProducts(sampleCategories, sampleProducts);

    const allInAi = filterExplorerProducts(enriched, sampleProducts, "ai-tools", "");
    assert.equal(allInAi.length, 2);

    const searchedInAi = filterExplorerProducts(enriched, sampleProducts, "ai-tools", "gemini");
    assert.equal(searchedInAi.length, 1);
    assert.equal(searchedInAi[0].slug, "gemini-advanced");

    const searchedGlobal = filterExplorerProducts(enriched, sampleProducts, "all", "canva");
    assert.equal(searchedGlobal.length, 1);
    assert.equal(searchedGlobal[0].slug, "canva-pro");
  });

  it("wraps scrollLeft seamlessly for infinite right-to-left auto-scroll", () => {
    // 3 copies, each 900px wide (total 2700px)
    const normalStep = computeInfiniteScrollStep({
      currentScrollLeft: 400,
      totalScrollWidth: 2700,
      copiesCount: 3,
      deltaPx: 1.5,
    });
    assert.equal(normalStep, 401.5);

    // Crossing 2 * singleSetWidth (1800px) wraps back to 901px
    const wrappedStep = computeInfiniteScrollStep({
      currentScrollLeft: 1799.5,
      totalScrollWidth: 2700,
      copiesCount: 3,
      deltaPx: 1.5,
    });
    assert.equal(wrappedStep, 901);
  });
});
