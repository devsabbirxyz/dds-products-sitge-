export interface ComparableVariant {
  id: string;
  label: string;
  regular_price: number | null;
  offer_price: number | null;
  stock_quantity: number | null;
  is_active: boolean;
}

export interface EnrichedComparableVariant extends ComparableVariant {
  offerPrice: number;
  regularPrice: number;
  savingsAmount: number;
  savingsPercent: number;
  isBestValue: boolean;
  isOutOfStock: boolean;
}

export interface VariantComparisonSummary {
  activeVariants: EnrichedComparableVariant[];
  bestValueId: string | null;
  maxOfferPrice: number;
}

/**
 * Computes price comparison metrics, savings percentage, stock availability,
 * and lowest-price ("BEST") variant highlight for active product variants.
 */
export function computeVariantComparison(
  variants: ComparableVariant[],
  trackStock = false,
): VariantComparisonSummary {
  const active = (variants ?? []).filter((v) => v && v.is_active);
  if (active.length === 0) {
    return {
      activeVariants: [],
      bestValueId: null,
      maxOfferPrice: 0,
    };
  }

  const getEffectiveOffer = (v: ComparableVariant) => Number(v.offer_price ?? v.regular_price ?? 0);

  const maxOfferPrice = Math.max(...active.map(getEffectiveOffer));

  // Prefer in-stock variants when picking best value; fallback to all active variants
  const inStockActive = active.filter(
    (v) => !(trackStock && v.stock_quantity != null && Number(v.stock_quantity) <= 0),
  );
  const poolForBest = inStockActive.length > 0 ? inStockActive : active;

  const bestValueId =
    poolForBest.slice().sort((a, b) => getEffectiveOffer(a) - getEffectiveOffer(b))[0]?.id ?? null;

  const activeVariants: EnrichedComparableVariant[] = active.map((v) => {
    const offerPrice = getEffectiveOffer(v);
    const regularPrice = Number(v.regular_price ?? offerPrice);
    const savingsAmount = regularPrice > offerPrice ? regularPrice - offerPrice : 0;
    const savingsPercent =
      savingsAmount > 0 && regularPrice > 0 ? Math.round((savingsAmount / regularPrice) * 100) : 0;
    const isOutOfStock =
      Boolean(trackStock) && v.stock_quantity != null && Number(v.stock_quantity) <= 0;

    return {
      ...v,
      offerPrice,
      regularPrice,
      savingsAmount,
      savingsPercent,
      isBestValue: v.id === bestValueId,
      isOutOfStock,
    };
  });

  return {
    activeVariants,
    bestValueId,
    maxOfferPrice,
  };
}
