import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { categoriesQuery, productsQuery } from "@/lib/storefront";
import { ProductCard, EmptyState } from "@/components/storefront/ProductCard";
import { ProductGridSkeleton } from "@/components/storefront/ProductGridSkeleton";

type SortKey = "new" | "best" | "price_asc" | "price_desc";

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>) => ({
    focus: typeof s.focus === "string" ? s.focus : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
  }),
  head: () => ({
    meta: [
      { title: "শপ — DDS-Digital" },
      { name: "description", content: "DDS-Digital এর সব ডিজিটাল প্রোডাক্ট ব্রাউজ করুন — সাবস্ক্রিপশন, সফটওয়্যার, অ্যাকাউন্ট। ইনস্ট্যান্ট ডেলিভারি ও সিকিউর পেমেন্ট।" },
      { property: "og:title", content: "শপ — DDS-Digital" },
      { property: "og:description", content: "DDS-Digital এর সব ডিজিটাল প্রোডাক্ট ব্রাউজ করুন — সাবস্ক্রিপশন, সফটওয়্যার, অ্যাকাউন্ট। ইনস্ট্যান্ট ডেলিভারি ও সিকিউর পেমেন্ট।" },
      { property: "og:url", content: "/shop" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { focus, category: urlCategory } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(urlCategory ?? null);
  const [sort, setSort] = useState<SortKey>("new");
  const [mobileFilters, setMobileFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setCategory(urlCategory ?? null);
  }, [urlCategory]);

  useEffect(() => {
    if (focus === "search") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setMobileFilters(false);
    }
  }, [focus]);
  const [badge, setBadge] = useState<"new" | "best" | "featured" | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);

  const { data: cats = [] } = useQuery(categoriesQuery());
  const { data: productsRaw = [], isLoading } = useQuery(
    productsQuery({
      category,
      search: search || null,
      sort,
      minPrice: minPrice ? Number(minPrice) : null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      badge,
    })
  );

  // Client-side filters
  const products = productsRaw.filter((p: any) => {
    if (minRating > 0 && Number(p.average_rating ?? 0) < minRating) return false;
    if (inStockOnly && p.track_stock) {
      const variants = (p.product_variants ?? []).filter((v: any) => v.is_active);
      const out = variants.length > 0
        ? variants.every((v: any) => v.stock_quantity != null && Number(v.stock_quantity) <= 0)
        : (p.stock_quantity ?? 0) <= 0;
      if (out) return false;
    }
    return true;
  });

  const resetFilters = () => {
    setSearch(""); setCategory(null); setMinPrice(""); setMaxPrice(""); setBadge(null); setSort("new");
    setInStockOnly(false); setMinRating(0);
    navigate({ to: "/shop", search: {}, replace: true });
  };

  const closeSearchPanel = () => {
    setMobileFilters(false);
    navigate({ to: "/shop", search: category ? { category } : {}, replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-3.5 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl">
            <span className="text-gradient-brand">শপ</span> — সব প্রোডাক্ট
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            {isLoading ? "লোড হচ্ছে..." : `${products.length} টি প্রোডাক্ট পাওয়া গেছে`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileFilters(true)}
            className="lg:hidden rounded-xl glass px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold inline-flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4 text-primary" /> ফিল্টার ও সার্চ
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="flex-1 sm:flex-none rounded-xl glass px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium bg-card"
          >
            <option value="new">নতুন আগে</option>
            <option value="best">বেস্ট সেলিং</option>
            <option value="price_asc">কম দাম আগে</option>
            <option value="price_desc">বেশি দাম আগে</option>
          </select>
        </div>
      </div>

      {/* Mobile Search Bar (<lg) */}
      <div className="lg:hidden mb-3.5">
        <div
          className={`relative rounded-2xl transition-all ${
            focus === "search"
              ? "ring-2 ring-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              : ""
          }`}
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="প্রোডাক্ট বা সাবস্ক্রিপশন খুঁজুন..."
            aria-label="প্রোডাক্ট খুঁজুন"
            className="w-full rounded-2xl glass pl-10 pr-9 py-2.5 text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
              aria-label="সার্চ মুছুন"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Category Pills on Mobile & Tablet (<lg) */}
      {cats.length > 0 && (
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
              !category
                ? "bg-gradient-brand text-primary-foreground shadow-glow"
                : "glass text-foreground/80 hover:text-foreground"
            }`}
          >
            সব প্রোডাক্ট
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.slug)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                category === c.slug
                  ? "bg-gradient-brand text-primary-foreground shadow-glow"
                  : "glass text-foreground/80 hover:text-foreground"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[260px_1fr] gap-6 lg:gap-8">
        {/* Sidebar */}
        <aside
          className={`${mobileFilters ? "fixed inset-0 z-40 bg-background/95 backdrop-blur-xl p-4 pb-28 overflow-auto" : "hidden"} lg:relative lg:inset-auto lg:block lg:bg-transparent lg:p-0`}
        >
          {mobileFilters && (
            <div className="lg:hidden mb-4 flex items-center justify-between gap-3">
              <span className="text-base font-display font-bold text-foreground">প্রোডাক্ট ফিল্টার ও সার্চ</span>
              <button
                onClick={closeSearchPanel}
                className="inline-flex items-center gap-2 rounded-xl glass px-4 py-2 text-sm font-semibold hover:bg-accent"
                aria-label="সার্চ থেকে বের হন"
              >
                <X className="h-4 w-4" /> বের হন
              </button>
            </div>
          )}
          <div className="glass-card rounded-2xl p-5 lg:sticky lg:top-20">
            <h3 className="font-display font-bold text-base mb-4">ক্যাটাগরি</h3>
            <div className="space-y-1">
              <button
                onClick={() => { setCategory(null); setMobileFilters(false); }}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${!category ? "bg-gradient-brand text-primary-foreground font-semibold" : "hover:bg-accent"}`}
              >
                সব প্রোডাক্ট
              </button>
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCategory(c.slug); setMobileFilters(false); }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${category === c.slug ? "bg-gradient-brand text-primary-foreground font-semibold" : "hover:bg-accent"}`}
                >
                  {c.name}
                </button>
              ))}
              {cats.length === 0 && (
                <p className="text-xs text-muted-foreground">কোনো ক্যাটাগরি নেই</p>
              )}
            </div>

            <h3 className="font-display font-bold text-base mt-6 mb-3">সার্চ</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="প্রোডাক্ট খুঁজুন..."
                className="w-full rounded-xl glass pl-10 pr-3 py-2.5 text-sm bg-card"
              />
            </div>

            <h3 className="font-display font-bold text-base mt-6 mb-3">দাম রেঞ্জ (৳)</h3>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                className="w-full rounded-xl glass px-3 py-2 text-sm bg-card"
              />
              <input
                type="number"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="w-full rounded-xl glass px-3 py-2 text-sm bg-card"
              />
            </div>

            <h3 className="font-display font-bold text-base mt-6 mb-3">বৈশিষ্ট্য</h3>
            <div className="flex flex-wrap gap-2">
              {([
                { k: null, l: "সব" },
                { k: "new", l: "নতুন" },
                { k: "best", l: "বেস্ট সেলিং" },
                { k: "featured", l: "ফিচারড" },
              ] as const).map((b) => (
                <button
                  key={String(b.k)}
                  onClick={() => setBadge(b.k as any)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${badge === b.k ? "bg-gradient-brand text-primary-foreground shadow-glow" : "glass hover:bg-accent"}`}
                >
                  {b.l}
                </button>
              ))}
            </div>

            <h3 className="font-display font-bold text-base mt-6 mb-3">রেটিং</h3>
            <div className="flex flex-wrap gap-2">
              {[0, 4, 4.5].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${minRating === r ? "bg-gradient-brand text-primary-foreground shadow-glow" : "glass hover:bg-accent"}`}
                >
                  {r === 0 ? "সব" : `${r}+ ★`}
                </button>
              ))}
            </div>

            <label className="mt-5 flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="font-semibold">শুধু স্টকে আছে এমন দেখান</span>
            </label>

            <button
              onClick={resetFilters}
              className="mt-6 w-full rounded-xl glass px-3 py-2 text-xs font-semibold hover:bg-accent inline-flex items-center justify-center gap-1"
            >
              <X className="h-3 w-3" /> ফিল্টার রিসেট
            </button>
          </div>
        </aside>

        {/* Grid */}
        <div>
          {isLoading ? (
            <ProductGridSkeleton count={9} />
          ) : products.length === 0 ? (
            <EmptyState
              title="এখনো কোনো প্রোডাক্ট নেই"
              hint="অ্যাডমিন প্যানেল থেকে নতুন প্রোডাক্ট যোগ করুন।"
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
          <div className="mt-10 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← হোমে ফিরে যান</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
