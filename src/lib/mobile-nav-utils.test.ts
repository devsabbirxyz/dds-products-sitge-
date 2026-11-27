import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getActiveMobileTab,
  shouldHideMobileNavOnRoute,
  formatCartBadgeCount,
  computeScrollVisibility,
} from "./mobile-nav-utils";

describe("mobile-nav-utils", () => {
  describe("getActiveMobileTab", () => {
    it("matches exact / to home", () => {
      assert.equal(getActiveMobileTab("/"), "home");
    });

    it("matches /shop and nested /product routes to shop when not in search mode", () => {
      assert.equal(getActiveMobileTab("/shop"), "shop");
      assert.equal(getActiveMobileTab("/shop/software"), "shop");
      assert.equal(getActiveMobileTab("/product/chatgpt-plus"), "shop");
    });

    it("matches /shop with focus=search to search tab", () => {
      assert.equal(getActiveMobileTab("/shop", "search"), "search");
    });

    it("matches /cart and /checkout to cart tab", () => {
      assert.equal(getActiveMobileTab("/cart"), "cart");
      assert.equal(getActiveMobileTab("/checkout"), "cart");
    });

    it("matches /dashboard and /login to profile tab", () => {
      assert.equal(getActiveMobileTab("/dashboard"), "profile");
      assert.equal(getActiveMobileTab("/dashboard/orders"), "profile");
      assert.equal(getActiveMobileTab("/login"), "profile");
    });
  });

  describe("shouldHideMobileNavOnRoute", () => {
    it("hides on auth, verify, checkout, and admin pages", () => {
      assert.equal(shouldHideMobileNavOnRoute("/login"), true);
      assert.equal(shouldHideMobileNavOnRoute("/signup"), true);
      assert.equal(shouldHideMobileNavOnRoute("/verify"), true);
      assert.equal(shouldHideMobileNavOnRoute("/checkout"), true);
      assert.equal(shouldHideMobileNavOnRoute("/admin"), true);
      assert.equal(shouldHideMobileNavOnRoute("/admin/orders"), true);
    });

    it("remains visible on storefront and dashboard pages", () => {
      assert.equal(shouldHideMobileNavOnRoute("/"), false);
      assert.equal(shouldHideMobileNavOnRoute("/shop"), false);
      assert.equal(shouldHideMobileNavOnRoute("/cart"), false);
      assert.equal(shouldHideMobileNavOnRoute("/dashboard"), false);
      assert.equal(shouldHideMobileNavOnRoute("/dashboard/orders"), false);
    });
  });

  describe("formatCartBadgeCount", () => {
    it("returns null for 0 or negative counts", () => {
      assert.equal(formatCartBadgeCount(0), null);
      assert.equal(formatCartBadgeCount(-3), null);
    });

    it("formats counts 1..99 as exact numbers", () => {
      assert.equal(formatCartBadgeCount(1), "1");
      assert.equal(formatCartBadgeCount(15), "15");
      assert.equal(formatCartBadgeCount(99), "99");
    });

    it("caps counts above 99 at 99+", () => {
      assert.equal(formatCartBadgeCount(100), "99+");
      assert.equal(formatCartBadgeCount(154), "99+");
    });
  });

  describe("computeScrollVisibility", () => {
    it("always shows near top of page (scrollY < 30)", () => {
      const res = computeScrollVisibility({
        currentY: 12,
        lastY: 120,
        viewportHeight: 800,
        documentHeight: 2400,
        currentlyHidden: true,
      });
      assert.equal(res.hidden, false);
      assert.equal(res.nextLastY, 12);
    });

    it("clamps negative iOS rubber-band scrollY to 0 and keeps visible", () => {
      const res = computeScrollVisibility({
        currentY: -18,
        lastY: 0,
        viewportHeight: 800,
        documentHeight: 2400,
        currentlyHidden: false,
      });
      assert.equal(res.hidden, false);
      assert.equal(res.nextLastY, 0);
    });

    it("hides when scrolling down by more than 10px past top threshold", () => {
      const res = computeScrollVisibility({
        currentY: 150,
        lastY: 120,
        viewportHeight: 800,
        documentHeight: 2400,
        currentlyHidden: false,
      });
      assert.equal(res.hidden, true);
      assert.equal(res.nextLastY, 150);
    });

    it("shows when scrolling up by more than 6px", () => {
      const res = computeScrollVisibility({
        currentY: 140,
        lastY: 150,
        viewportHeight: 800,
        documentHeight: 2400,
        currentlyHidden: true,
      });
      assert.equal(res.hidden, false);
      assert.equal(res.nextLastY, 140);
    });

    it("always shows near the bottom of the page", () => {
      const res = computeScrollVisibility({
        currentY: 1580,
        lastY: 1400,
        viewportHeight: 800,
        documentHeight: 2400,
        currentlyHidden: true,
      });
      assert.equal(res.hidden, false);
      assert.equal(res.nextLastY, 1580);
    });
  });
});
