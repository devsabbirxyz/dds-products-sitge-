import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeSelectParam,
  sanitizeSupabaseRestUrl,
  getRestTableOrRpc,
  isUnmigratedTable,
} from "./supabase-rest-sanitizer";

test("sanitizeSelectParam strips unmigrated stock_quantity, track_stock, and subscription_plans fields", () => {
  const raw =
    "id,slug,title,track_stock,stock_quantity,product_variants(regular_price,offer_price,is_active,stock_quantity), subscription_plans(id,name,price)";
  const cleaned = sanitizeSelectParam(raw);
  assert.equal(
    cleaned,
    "id,slug,title,product_variants(regular_price,offer_price,is_active)",
  );
});

test("sanitizeSupabaseRestUrl preserves query parameters and cleans select param", () => {
  const url =
    "https://zazurmsortaoyopjgjxl.supabase.co/rest/v1/products?select=id%2Ctitle%2Ctrack_stock%2Cstock_quantity&is_active=eq.true";
  const cleaned = sanitizeSupabaseRestUrl(url);
  assert.equal(
    cleaned,
    "https://zazurmsortaoyopjgjxl.supabase.co/rest/v1/products?select=id%2Ctitle&is_active=eq.true",
  );
});

test("getRestTableOrRpc and isUnmigratedTable identify unmigrated tables", () => {
  assert.deepEqual(getRestTableOrRpc("/rest/v1/bundles"), {
    type: "table",
    name: "bundles",
  });
  assert.equal(isUnmigratedTable("bundles"), true);
  assert.equal(isUnmigratedTable("products"), false);
});
