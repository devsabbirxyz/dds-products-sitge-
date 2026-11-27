const UNMIGRATED_TABLES = new Set([
  "bundles",
  "bundle_items",
  "product_questions",
  "subscription_plans",
  "stock_notifications",
  "abandoned_carts",
]);

export function sanitizeSelectParam(select: string): string {
  return select
    .replace(/,\s*subscription_plans\([^)]*\)/g, "")
    .replace(/,\s*track_stock/g, "")
    .replace(/,\s*stock_quantity/g, "")
    .replace(/,\s*category\b(?!_id)/g, "")
    .replace(/,\s*author_name\b/g, "")
    .replace(/\btrack_stock\s*,\s*/g, "")
    .replace(/\bstock_quantity\s*,\s*/g, "");
}

export function sanitizeSupabaseRestUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const select = u.searchParams.get("select");
    if (select) {
      const cleaned = sanitizeSelectParam(select);
      if (cleaned !== select) {
        u.searchParams.set("select", cleaned);
      }
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
}

export function getRestTableOrRpc(pathname: string): {
  type: "table" | "rpc" | null;
  name: string | null;
} {
  const rpcMatch = pathname.match(/\/rest\/v1\/rpc\/([^/?]+)/);
  if (rpcMatch) {
    return { type: "rpc", name: rpcMatch[1] };
  }
  const tableMatch = pathname.match(/\/rest\/v1\/([^/?]+)/);
  if (tableMatch) {
    return { type: "table", name: tableMatch[1] };
  }
  return { type: null, name: null };
}

export function isUnmigratedTable(name: string | null): boolean {
  return Boolean(name && UNMIGRATED_TABLES.has(name));
}
