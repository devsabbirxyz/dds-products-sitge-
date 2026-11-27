export type MobileNavTabKey = "home" | "shop" | "search" | "cart" | "profile";

/**
 * Determines which of the 5 Telegram-style mobile bottom navigation tabs is active
 * for a given pathname and query search focus state.
 */
export function getActiveMobileTab(pathname: string, searchFocus?: string): MobileNavTabKey {
  const cleanPath = (pathname || "/").split("?")[0];

  if (cleanPath === "/") {
    return "home";
  }

  if (cleanPath.startsWith("/shop") && searchFocus === "search") {
    return "search";
  }

  if (cleanPath.startsWith("/shop") || cleanPath.startsWith("/product")) {
    return "shop";
  }

  if (cleanPath.startsWith("/cart") || cleanPath.startsWith("/checkout")) {
    return "cart";
  }

  if (
    cleanPath.startsWith("/dashboard") ||
    cleanPath.startsWith("/login") ||
    cleanPath.startsWith("/signup") ||
    cleanPath.startsWith("/register") ||
    cleanPath.startsWith("/order")
  ) {
    return "profile";
  }

  return "home";
}

/**
 * Determines whether the mobile bottom navigation bar should be completely hidden
 * on full-screen auth, verification, checkout, or admin routes.
 */
export function shouldHideMobileNavOnRoute(pathname: string): boolean {
  const cleanPath = (pathname || "/").split("?")[0];
  const hiddenPrefixes = [
    "/login",
    "/signup",
    "/register",
    "/verify",
    "/forgot-password",
    "/reset-password",
    "/checkout",
    "/admin",
    "/admin-login",
  ];

  return hiddenPrefixes.some(
    (prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`),
  );
}

/**
 * Formats the cart item count for the mobile bottom nav badge.
 * Returns null when count <= 0, and caps > 99 at "99+".
 */
export function formatCartBadgeCount(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }
  const intCount = Math.floor(count);
  if (intCount <= 0) {
    return null;
  }
  if (intCount > 99) {
    return "99+";
  }
  return String(intCount);
}

export interface ScrollVisibilityInput {
  currentY: number;
  lastY: number;
  viewportHeight: number;
  documentHeight: number;
  currentlyHidden: boolean;
}

export interface ScrollVisibilityResult {
  hidden: boolean;
  nextLastY: number;
}

/**
 * Computes Pinterest-style hide-on-scroll-down / show-on-scroll-up state:
 * 1. Clamps negative scrollY (iOS Safari rubber-banding) to 0.
 * 2. Always visible near top of page (scrollY < 30px).
 * 3. Always visible near bottom of page (scrollY + innerHeight >= scrollHeight - 30px).
 * 4. Hides when downward delta > 10px.
 * 5. Shows when upward delta < -6px.
 * 6. Ignores micro-scrolls in dead zone [-6, 10] without advancing lastY so cumulative scrolls trigger smoothly.
 */
export function computeScrollVisibility(input: ScrollVisibilityInput): ScrollVisibilityResult {
  const y = Math.max(0, input.currentY);
  const lastY = Math.max(0, input.lastY);

  // Rule 1: Always visible at the very top
  if (y < 30) {
    return { hidden: false, nextLastY: y };
  }

  // Rule 2: Always visible at the very bottom
  if (
    input.documentHeight > input.viewportHeight &&
    y + input.viewportHeight >= input.documentHeight - 30
  ) {
    return { hidden: false, nextLastY: y };
  }

  const delta = y - lastY;

  // Rule 3: Downward scroll (> 10px threshold) -> hide
  if (delta > 10) {
    return { hidden: true, nextLastY: y };
  }

  // Rule 4: Upward scroll (< -6px threshold) -> show
  if (delta < -6) {
    return { hidden: false, nextLastY: y };
  }

  // Dead zone: preserve current state and anchor
  return { hidden: input.currentlyHidden, nextLastY: lastY };
}
