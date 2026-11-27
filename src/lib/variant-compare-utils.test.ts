import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeVariantComparison, type ComparableVariant } from "./variant-compare-utils";

describe("variant-compare-utils", () => {
  const sampleVariants: ComparableVariant[] = [
    {
      id: "v1",
      label: "১ মাস (Shared)",
      regular_price: 500,
      offer_price: 350,
      stock_quantity: 10,
      is_active: true,
    },
    {
      id: "v2",
      label: "৬ মাস (Private)",
      regular_price: 2400,
      offer_price: 1800,
      stock_quantity: 4,
      is_active: true,
    },
    {
      id: "v3",
      label: "১২ মাস (Out of stock)",
      regular_price: 4000,
      offer_price: 200,
      stock_quantity: 0,
      is_active: true,
    },
    {
      id: "v4",
      label: "Inactive plan",
      regular_price: 100,
      offer_price: 50,
      stock_quantity: 5,
      is_active: false,
    },
  ];

  it("filters out inactive variants and calculates savings accurately", () => {
    const res = computeVariantComparison(sampleVariants, true);
    assert.equal(res.activeVariants.length, 3);

    const v1 = res.activeVariants.find((v) => v.id === "v1")!;
    assert.equal(v1.offerPrice, 350);
    assert.equal(v1.regularPrice, 500);
    assert.equal(v1.savingsAmount, 150);
    assert.equal(v1.savingsPercent, 30);
    assert.equal(v1.isOutOfStock, false);
  });

  it("picks the lowest-priced in-stock variant as bestValueId when trackStock is true", () => {
    const res = computeVariantComparison(sampleVariants, true);
    assert.equal(res.bestValueId, "v1");
    const v3 = res.activeVariants.find((v) => v.id === "v3")!;
    assert.equal(v3.isOutOfStock, true);
    assert.equal(v3.isBestValue, false);
  });

  it("marks all variants in stock when trackStock is false", () => {
    const res = computeVariantComparison(sampleVariants, false);
    assert.equal(res.bestValueId, "v3");
    assert.equal(
      res.activeVariants.every((v) => !v.isOutOfStock),
      true,
    );
  });
});
