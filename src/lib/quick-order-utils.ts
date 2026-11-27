export interface QuickOrderPriceInput {
  unitRegularPrice: number | null | undefined;
  unitOfferPrice: number | null | undefined;
  quantity: number;
}

export interface QuickOrderPriceResult {
  quantity: number;
  unitRegular: number;
  unitOffer: number;
  regularTotal: number;
  subtotal: number;
  savings: number;
}

/**
 * Normalizes a Bangladeshi mobile number by stripping spaces/hyphens/+88
 * and validating that it matches a valid 11-digit 01[3-9]XXXXXXXX format
 * (or at least 6-20 digits for international numbers).
 */
export function normalizeBdPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, "").trim();
  if (cleaned.startsWith("+8801") && cleaned.length === 14) {
    return cleaned.slice(3);
  }
  if (cleaned.startsWith("8801") && cleaned.length === 13) {
    return cleaned.slice(2);
  }
  return cleaned;
}

export function isValidCustomerPhone(raw: string): boolean {
  const normalized = normalizeBdPhone(raw);
  if (/^01[3-9]\d{8}$/.test(normalized)) return true;
  return /^\+?\d{7,15}$/.test(normalized);
}

export function normalizeTrxId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidTrxId(raw: string): boolean {
  const cleaned = normalizeTrxId(raw);
  return cleaned.length >= 4 && cleaned.length <= 40 && /^[A-Z0-9\-_]+$/.test(cleaned);
}

export function calculateQuickOrderTotals(input: QuickOrderPriceInput): QuickOrderPriceResult {
  const quantity = Math.max(1, Math.min(20, Math.floor(Number(input.quantity) || 1)));
  const rawRegular = Number(input.unitRegularPrice ?? input.unitOfferPrice ?? 0);
  const rawOffer = Number(input.unitOfferPrice ?? input.unitRegularPrice ?? 0);
  const unitRegular = Math.max(0, rawRegular);
  const unitOffer = Math.max(0, rawOffer > 0 ? rawOffer : unitRegular);
  const regularTotal = unitRegular * quantity;
  const subtotal = unitOffer * quantity;
  const savings = Math.max(0, regularTotal - subtotal);

  return {
    quantity,
    unitRegular,
    unitOffer,
    regularTotal,
    subtotal,
    savings,
  };
}

export function getOrderStatusMeta(status: string | null | undefined, deliveryStatus?: string | null) {
  const s = (status || "pending").toLowerCase();
  const d = (deliveryStatus || "pending").toLowerCase();

  if (s === "completed" || d === "delivered") {
    return {
      labelBn: "ডেলিভারি সম্পন্ন",
      labelEn: "Delivered",
      tone: "emerald" as const,
      step: 3,
    };
  }
  if (s === "approved" || s === "processing") {
    return {
      labelBn: "পেমেন্ট ভেরিফায়েড · প্রসেসিং",
      labelEn: "Processing",
      tone: "blue" as const,
      step: 2,
    };
  }
  if (s === "rejected" || s === "cancelled") {
    return {
      labelBn: "বাতিল / রিজেক্টেড",
      labelEn: "Rejected",
      tone: "rose" as const,
      step: 0,
    };
  }
  return {
    labelBn: "পেমেন্ট ভেরিফিকেশন পেন্ডিং",
    labelEn: "Pending Verification",
    tone: "amber" as const,
    step: 1,
  };
}
