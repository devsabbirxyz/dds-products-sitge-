import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBdPhone,
  isValidCustomerPhone,
  normalizeTrxId,
  isValidTrxId,
  calculateQuickOrderTotals,
  getOrderStatusMeta,
} from "./quick-order-utils";

describe("quick-order-utils", () => {
  it("normalizes and validates Bangladeshi phone numbers", () => {
    assert.equal(normalizeBdPhone("+8801712-345678"), "01712345678");
    assert.equal(normalizeBdPhone("8801812 345678"), "01812345678");
    assert.equal(isValidCustomerPhone("01712345678"), true);
    assert.equal(isValidCustomerPhone("+8801911223344"), true);
    assert.equal(isValidCustomerPhone("123"), false);
  });

  it("normalizes and validates bKash/Nagad transaction IDs", () => {
    assert.equal(normalizeTrxId("  bk98a7x2 "), "BK98A7X2");
    assert.equal(isValidTrxId("BK98A7X2"), true);
    assert.equal(isValidTrxId("ab"), false);
  });

  it("calculates quick order totals and discount savings accurately", () => {
    const res = calculateQuickOrderTotals({
      unitRegularPrice: 650,
      unitOfferPrice: 390,
      quantity: 2,
    });
    assert.equal(res.quantity, 2);
    assert.equal(res.unitRegular, 650);
    assert.equal(res.unitOffer, 390);
    assert.equal(res.regularTotal, 1300);
    assert.equal(res.subtotal, 780);
    assert.equal(res.savings, 520);
  });

  it("returns appropriate order tracking status metadata", () => {
    assert.equal(getOrderStatusMeta("pending", "pending").step, 1);
    assert.equal(getOrderStatusMeta("approved", "pending").step, 2);
    assert.equal(getOrderStatusMeta("completed", "delivered").step, 3);
    assert.equal(getOrderStatusMeta("rejected", "pending").step, 0);
  });
});
