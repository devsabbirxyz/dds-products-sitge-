import { Link } from "@tanstack/react-router";
import { Eye, Layers, ArrowUpRight, Zap, GitCompareArrows } from "lucide-react";
import { toast } from "sonner";
import { formatBDT } from "@/lib/storefront";
import { useCompare } from "@/lib/compare";
import { SmartImage } from "./SmartImage";

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  title_en?: string | null;
  short_description?: string | null;
  regular_price?: number | null;
  offer_price?: number | null;
  average_rating?: number | null;
  total_reviews?: number | null;
  is_featured?: boolean | null;
  is_new_arrival?: boolean | null;
  is_best_seller?: boolean | null;
  is_variant?: boolean | null;
  view_count?: number | null;
  track_stock?: boolean | null;
  stock_quantity?: number | null;
  product_images?: Array<{ image_url: string; is_main?: boolean | null; sort_order?: number | null }> | null;
  product_variants?: Array<{ regular_price?: number | null; offer_price?: number | null; is_active?: boolean | null; stock_quantity?: number | null }> | null;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const price = p.offer_price ?? p.regular_price;
  const hasDiscount = p.offer_price != null && p.regular_price != null && p.offer_price < p.regular_price;
  const { has: inCompare, toggle: toggleCompare, setOpen: openCompare } = useCompare();
  const compared = inCompare(p.id);

  const activeVariants = (p.product_variants ?? []).filter((v) => v.is_active);
  const isVariant = !!p.is_variant && activeVariants.length > 0;
  const variantPrices = activeVariants
    .map((v) => Number(v.offer_price ?? v.regular_price ?? 0))
    .filter((n) => n > 0);
  const variantMin = variantPrices.length ? Math.min(...variantPrices) : null;
  const variantMax = variantPrices.length ? Math.max(...variantPrices) : null;

  // Out of stock logic
  const outOfStock = !!p.track_stock && (
    isVariant
      ? activeVariants.every((v) => v.stock_quantity != null && Number(v.stock_quantity) <= 0)
      : (p.stock_quantity ?? 0) <= 0
  );

  const views = p.view_count ?? 0;

  const images = (p.product_images ?? []).slice().sort((a, b) => {
    if ((b.is_main ? 1 : 0) !== (a.is_main ? 1 : 0)) return (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0);
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  const mainImage = images[0]?.image_url ?? null;

  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card/95 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.65)] transition-transform duration-200 hover:-translate-y-1 hover:border-primary/50 h-full"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 shrink-0">
        <SmartImage
          src={mainImage}
          alt={p.title}
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${outOfStock ? "grayscale opacity-60" : ""}`}
          width={400}
          height={300}
        />
        {outOfStock && (
          <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-[1px]">
            <span className="rounded-full bg-destructive px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-destructive-foreground shadow-lg uppercase tracking-wide">
              Out of Stock
            </span>
          </div>
        )}


        {/* top-left badges */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1 sm:gap-1.5 max-w-[70%]">
          {p.is_best_seller && (
            <span
              className="rounded-lg px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold text-white shadow-[0_0_12px_rgba(245,158,11,0.5)] whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#F59E0B,#EA580C)" }}
            >
              🏆 Best Seller
            </span>
          )}
          {isVariant && !p.is_best_seller && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/75 backdrop-blur px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold text-foreground border border-primary/30 whitespace-nowrap">
              <Layers className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" /> Variants
            </span>
          )}
        </div>

        {/* discount badge */}
        {hasDiscount && !isVariant && (
          <span className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 rounded-full bg-destructive px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold text-destructive-foreground shadow">
            -{Math.round((1 - Number(p.offer_price) / Number(p.regular_price)) * 100)}%
          </span>
        )}

        {/* views */}
        <span className="hidden sm:inline-flex absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 items-center gap-1 rounded-full bg-background/65 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-foreground/80 border border-border/50">
          <Eye className="h-3 w-3" /> {views}
        </span>

        {/* compare toggle top-right */}
        <div className="hidden sm:flex absolute top-2.5 right-2.5 sm:top-3 sm:right-3 items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const res = toggleCompare({
                id: p.id,
                slug: p.slug,
                title: p.title,
                image: mainImage,
                price: p.offer_price ?? p.regular_price ?? null,
                regularPrice: p.regular_price ?? null,
                rating: p.average_rating ?? null,
                totalReviews: p.total_reviews ?? null,
                stockQuantity: p.stock_quantity ?? null,
                trackStock: p.track_stock ?? null,
                sellerName: null,
                shortDescription: p.short_description ?? null,
              });
              if (res.reason) toast.error(res.reason);
              else if (res.added) {
                toast.success("তুলনায় যোগ হয়েছে", {
                  action: { label: "দেখুন", onClick: () => openCompare(true) },
                });
              } else toast("তুলনা থেকে সরানো হয়েছে");
            }}
            aria-label={compared ? "Remove from compare" : "Add to compare"}
            className={`grid h-7 w-7 lg:h-8 lg:w-8 place-items-center rounded-full border border-background/80 shadow-lg transition ${compared ? "bg-gradient-brand text-primary-foreground" : "bg-background/80 text-foreground hover:bg-primary/20"}`}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 sm:p-3.5 lg:p-4 flex flex-col flex-1">
        <h3 className="font-display font-bold text-xs sm:text-sm lg:text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">
          {p.title}
        </h3>
        {p.short_description && (
          <p className="mt-1 sm:mt-1.5 text-[11px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2 leading-relaxed">
            {p.short_description}
          </p>
        )}

        {/* Price + CTA */}
        <div className="mt-auto pt-2.5 sm:pt-3.5 flex items-center justify-between gap-1.5">
          <div className="rounded-full bg-background/60 backdrop-blur border border-border/60 px-2 sm:px-2.5 py-1 min-w-0">
            {isVariant && variantMin != null && variantMax != null && variantMin !== variantMax ? (
              <span className="font-display font-bold text-[10px] sm:text-xs lg:text-[13px] text-gradient-brand whitespace-nowrap block">
                {formatBDT(variantMin)} - {formatBDT(variantMax)}
              </span>
            ) : (
              <span className="flex items-baseline gap-1">
                <span className="font-display font-bold text-[11px] sm:text-sm lg:text-base text-gradient-brand whitespace-nowrap">{formatBDT(price)}</span>
                {hasDiscount && (
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground line-through hidden sm:inline whitespace-nowrap">{formatBDT(p.regular_price)}</span>
                )}
              </span>
            )}
          </div>

          <span className="relative inline-flex items-center gap-0.5 sm:gap-1 rounded-full px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold text-white shadow-glow bg-[linear-gradient(135deg,#059669,#10b981,#06b6d4)] bg-[length:200%_200%] bg-left transition-[background-position,transform] duration-500 group-hover:bg-right group-hover:scale-105 shrink-0 whitespace-nowrap">
            <span>কিনুন</span>
            <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </span>
        </div>
      </div>

      {/* hover glow ring */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl ring-1 ring-inset ring-primary/0 group-hover:ring-primary/30 transition" />
    </Link>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="glass-card rounded-3xl p-10 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-brand grid place-items-center shadow-glow mb-3">
        <Zap className="h-7 w-7 text-primary-foreground" />
      </div>
      <h3 className="font-display font-bold text-xl">{title}</h3>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
