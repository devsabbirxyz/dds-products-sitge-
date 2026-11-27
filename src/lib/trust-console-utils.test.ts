import test from "node:test";
import assert from "node:assert/strict";
import {
  computeGiftProgress,
  toBanglaNumber,
  normalizeLiveStats,
  DEFAULT_GIFT_THRESHOLD,
} from "./trust-console-utils";

test("toBanglaNumber converts ASCII numerals to Bangla digits", () => {
  assert.equal(toBanglaNumber(28), "২৮");
  assert.equal(toBanglaNumber("1500+"), "১৫০০+");
  assert.equal(toBanglaNumber("4.9★"), "৪.৯★");
  assert.equal(toBanglaNumber(100), "১০০");
});

test("computeGiftProgress calculates progress, remaining, and milestone stages accurately", () => {
  const zero = computeGiftProgress(0, DEFAULT_GIFT_THRESHOLD);
  assert.equal(zero.subtotal, 0);
  assert.equal(zero.remaining, 500);
  assert.equal(zero.progressPercent, 0);
  assert.equal(zero.unlocked, false);
  assert.equal(zero.milestoneStage, "start");

  const halfway = computeGiftProgress(250, 500);
  assert.equal(halfway.remaining, 250);
  assert.equal(halfway.progressPercent, 50);
  assert.equal(halfway.unlocked, false);
  assert.equal(halfway.milestoneStage, "halfway");

  const almost = computeGiftProgress(400, 500);
  assert.equal(almost.remaining, 100);
  assert.equal(almost.progressPercent, 80);
  assert.equal(almost.almostThere, true);
  assert.equal(almost.milestoneStage, "almost");

  const unlocked = computeGiftProgress(650, 500);
  assert.equal(unlocked.remaining, 0);
  assert.equal(unlocked.progressPercent, 100);
  assert.equal(unlocked.unlocked, true);
  assert.equal(unlocked.milestoneStage, "unlocked");
});

test("normalizeLiveStats enforces baseline floors and valid rating range", () => {
  const fallback = normalizeLiveStats(null);
  assert.equal(fallback.ordersToday, 28);
  assert.equal(fallback.customers, 1500);
  assert.equal(fallback.avgRating, 4.9);
  assert.equal(fallback.securePercent, 100);

  const live = normalizeLiveStats({ ordersToday: 44, customers: 2340, avgRating: 4.95 });
  assert.equal(live.ordersToday, 44);
  assert.equal(live.customers, 2340);
  assert.equal(live.avgRating, 5.0);
});
