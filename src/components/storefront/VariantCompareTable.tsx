import { Check, Sparkles, X } from "lucide-react";
import { formatBDT } from "@/lib/storefront";
import { computeVariantComparison, type ComparableVariant } from "@/lib/variant-compare-utils";

export function VariantCompareTable({
  variants,
  selectedId,
  onSelect,
  trackStock,
}: {
  variants: ComparableVariant[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  trackStock?: boolean;
}) {
  const { activeVariants, maxOfferPrice } = computeVariantComparison(variants, trackStock);

  if (activeVariants.length === 0) return null;

  const gridColsClass = trackStock
    ? "sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]"
    : "sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]";

  return (
    <section
      aria-label="ভ্যারিয়েন্ট তুলনা"
      data-testid="variant-compare-section"
      className="mt-4 sm:mt-5 rounded-2xl border border-border/60 bg-background/35 p-3 sm:p-4 overflow-hidden select-none"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-display font-bold text-sm sm:text-base text-foreground truncate">
            ভ্যারিয়েন্ট তুলনা
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/25 px-2 py-0.5 text-[10px] font-semibold text-primary shrink-0">
            <Sparkles className="h-2.5 w-2.5" /> যেকোনো সারিতে ট্যাপ করুন
          </span>
        </div>
        <span className="hidden xs:inline text-[10px] sm:text-xs text-muted-foreground shrink-0">
          সেরা দাম হাইলাইটেড
        </span>
      </div>

      {/* Desktop / Tablet Column Headers (sm+) */}
      <div
        className={`hidden sm:grid ${gridColsClass} items-center gap-3 px-3.5 pb-2 mb-2 text-xs font-semibold text-muted-foreground border-b border-border/60`}
      >
        <div>ভ্যারিয়েন্ট</div>
        <div className="text-right">দাম</div>
        <div className="text-right">সেভ</div>
        {trackStock && <div className="text-right">স্টক</div>}
        <div className="text-right">নির্বাচন</div>
      </div>

      {/* Interactive Full-Row Clickable Variant List (Mobile & Desktop) */}
      <div
        role="radiogroup"
        aria-label="ভ্যারিয়েন্ট তুলনা তালিকা"
        className="space-y-2 sm:space-y-2"
      >
        {activeVariants.map((v) => {
          const isSelected = v.id === selectedId;
          const handleRowSelect = () => {
            if (v.isOutOfStock) return;
            onSelect?.(v.id);
          };

          return (
            <div
              key={v.id}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={v.isOutOfStock}
              tabIndex={v.isOutOfStock ? -1 : 0}
              data-testid={`variant-compare-row-${v.id}`}
              data-selected={isSelected ? "true" : "false"}
              onClick={handleRowSelect}
              onKeyDown={(e) => {
                if (v.isOutOfStock) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.(v.id);
                }
              }}
              className={`group relative rounded-xl border p-3 sm:px-3.5 sm:py-3 transition-all duration-150 ${
                v.isOutOfStock
                  ? "opacity-55 cursor-not-allowed border-border/40 bg-card/30"
                  : isSelected
                    ? "cursor-pointer border-primary/70 bg-primary/12 shadow-[0_0_22px_-6px_hsl(var(--primary)/0.45)] ring-1 ring-primary/40 active:scale-[0.99]"
                    : "cursor-pointer border-border/50 bg-card/40 hover:border-primary/45 hover:bg-primary/5 active:scale-[0.99]"
              }`}
            >
              <div
                className={`flex items-center justify-between gap-2.5 sm:grid ${gridColsClass} sm:gap-3`}
              >
                {/* Column 1: Radio Indicator + Variant Name + Mobile Badges */}
                <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                  {/* Radio / Check Circle */}
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 sm:mt-0 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? "border-transparent bg-gradient-brand text-primary-foreground shadow-glow scale-105"
                        : "border-muted-foreground/45 bg-background/50 group-hover:border-primary/70"
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-3 w-3 stroke-[2.8]" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-transparent group-hover:bg-primary/50 transition-colors" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span
                        className={`font-semibold text-xs sm:text-sm leading-snug break-words ${
                          isSelected ? "text-primary font-bold" : "text-foreground"
                        }`}
                      >
                        {v.label}
                      </span>
                      {v.isBestValue && (
                        <span className="rounded-full bg-gradient-brand text-primary-foreground px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase shrink-0">
                          BEST
                        </span>
                      )}
                    </div>

                    {/* Mobile-only compact meta badges (Save % & Stock) */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">
                      {v.savingsPercent > 0 && (
                        <span className="inline-flex items-center rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          -{v.savingsPercent}% সেভ
                        </span>
                      )}
                      {trackStock && (
                        <span className="inline-flex items-center text-[10px] font-medium">
                          {v.stock_quantity == null ? (
                            <span className="text-emerald-400 inline-flex items-center gap-0.5">
                              <Check className="h-3 w-3" /> ইন স্টক
                            </span>
                          ) : v.isOutOfStock ? (
                            <span className="text-destructive font-semibold inline-flex items-center gap-0.5">
                              <X className="h-3 w-3" /> স্টক শেষ
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              স্টকে:{" "}
                              <strong className="text-foreground">{v.stock_quantity} টি</strong>
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2 (Desktop): Price */}
                <div className="hidden sm:block text-right">
                  <div className="font-display font-bold text-sm sm:text-base text-gradient-brand">
                    {formatBDT(v.offerPrice)}
                  </div>
                  {v.regularPrice > v.offerPrice && (
                    <div className="text-[10px] text-muted-foreground line-through">
                      {formatBDT(v.regularPrice)}
                    </div>
                  )}
                </div>

                {/* Column 3 (Desktop): Savings */}
                <div className="hidden sm:block text-right text-xs">
                  {v.savingsPercent > 0 ? (
                    <span className="inline-flex items-center rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                      -{v.savingsPercent}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                {/* Column 4 (Desktop): Stock */}
                {trackStock && (
                  <div className="hidden sm:block text-right text-xs">
                    {v.stock_quantity == null ? (
                      <Check className="h-3.5 w-3.5 inline text-emerald-500" />
                    ) : v.isOutOfStock ? (
                      <span className="text-destructive font-semibold inline-flex items-center justify-end gap-1">
                        <X className="h-3 w-3" /> শেষ
                      </span>
                    ) : (
                      <span className="font-semibold text-foreground">{v.stock_quantity} টি</span>
                    )}
                  </div>
                )}

                {/* Right Side on Mobile (Price + Action Pill) / Column 5 on Desktop (Action Pill) */}
                <div className="flex flex-col items-end sm:items-end gap-1 shrink-0">
                  {/* Mobile-only price stack */}
                  <div className="sm:hidden text-right leading-tight">
                    <div className="font-display font-bold text-sm text-gradient-brand">
                      {formatBDT(v.offerPrice)}
                    </div>
                    {v.regularPrice > v.offerPrice && (
                      <div className="text-[10px] text-muted-foreground line-through">
                        {formatBDT(v.regularPrice)}
                      </div>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold transition pointer-events-none ${
                      v.isOutOfStock
                        ? "glass text-muted-foreground"
                        : isSelected
                          ? "bg-gradient-brand text-primary-foreground shadow-glow"
                          : "glass text-foreground/90 group-hover:border-primary/40 group-hover:text-primary"
                    }`}
                  >
                    {v.isOutOfStock ? (
                      "স্টক শেষ"
                    ) : isSelected ? (
                      <>
                        <Check className="h-3 w-3 stroke-[2.5]" /> নির্বাচিত
                      </>
                    ) : (
                      "বেছে নিন"
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {maxOfferPrice > 0 && <div className="sr-only">Max: {maxOfferPrice}</div>}
    </section>
  );
}
