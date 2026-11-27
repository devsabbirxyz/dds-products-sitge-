export const DEFAULT_GIFT_THRESHOLD = 500;

export interface GiftProgressState {
  subtotal: number;
  threshold: number;
  remaining: number;
  progressPercent: number;
  unlocked: boolean;
  almostThere: boolean;
  milestoneStage: "start" | "halfway" | "almost" | "unlocked";
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function toBanglaNumber(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function computeGiftProgress(
  rawSubtotal: number,
  threshold: number = DEFAULT_GIFT_THRESHOLD,
): GiftProgressState {
  const safeThreshold = Math.max(
    1,
    Number.isFinite(threshold) ? threshold : DEFAULT_GIFT_THRESHOLD,
  );
  const subtotal = Math.max(0, Number.isFinite(rawSubtotal) ? Math.round(rawSubtotal) : 0);
  const remaining = Math.max(0, safeThreshold - subtotal);
  const rawPct = (subtotal / safeThreshold) * 100;
  const progressPercent = Math.min(100, Math.max(0, Number(rawPct.toFixed(1))));
  const unlocked = subtotal >= safeThreshold;
  const almostThere = !unlocked && progressPercent >= 60;

  let milestoneStage: GiftProgressState["milestoneStage"] = "start";
  if (unlocked) {
    milestoneStage = "unlocked";
  } else if (progressPercent >= 75) {
    milestoneStage = "almost";
  } else if (progressPercent >= 40) {
    milestoneStage = "halfway";
  }

  return {
    subtotal,
    threshold: safeThreshold,
    remaining,
    progressPercent,
    unlocked,
    almostThere,
    milestoneStage,
  };
}

export interface LiveStatsInput {
  ordersToday?: number | null;
  customers?: number | null;
  avgRating?: number | null;
}

export interface NormalizedLiveStats {
  ordersToday: number;
  customers: number;
  avgRating: number;
  securePercent: number;
}

export function normalizeLiveStats(input?: LiveStatsInput | null): NormalizedLiveStats {
  const ordersToday = Math.max(28, Math.round(Number(input?.ordersToday ?? 0) || 0));
  const customers = Math.max(1500, Math.round(Number(input?.customers ?? 0) || 0));
  const rawRating = Number(input?.avgRating ?? 4.9);
  const avgRating =
    Number.isFinite(rawRating) && rawRating >= 4.0 && rawRating <= 5.0
      ? Number(rawRating.toFixed(1))
      : 4.9;

  return {
    ordersToday,
    customers,
    avgRating,
    securePercent: 100,
  };
}
