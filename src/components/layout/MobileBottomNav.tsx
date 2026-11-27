import { useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CircleUser, Home, Search, ShoppingBag, ShoppingCart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import {
  computeScrollVisibility,
  formatCartBadgeCount,
  getActiveMobileTab,
  shouldHideMobileNavOnRoute,
  type MobileNavTabKey,
} from "@/lib/mobile-nav-utils";
import { useTheme } from "@/lib/theme";

interface TabDefinition {
  key: MobileNavTabKey;
  label: string;
  to: "/" | "/shop" | "/cart" | "/dashboard" | "/login";
  search?: Record<string, string>;
}

export function MobileBottomNav() {
  const { count } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const searchObj = useRouterState({
    select: (st) => st.location.search as Record<string, unknown>,
  });
  const searchFocus = typeof searchObj?.focus === "string" ? searchObj.focus : undefined;

  const [mounted, setMounted] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [scrollHidden, setScrollHidden] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [badgePop, setBadgePop] = useState(false);

  const lastScrollYRef = useRef(0);
  const hiddenRef = useRef(false);
  const prevCountRef = useRef(count);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    }
  }, []);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.photoURL]);

  // Pop animation on cart badge whenever count changes
  useEffect(() => {
    if (prevCountRef.current !== count && count > 0) {
      setBadgePop(true);
      const timer = window.setTimeout(() => setBadgePop(false), 320);
      prevCountRef.current = count;
      return () => window.clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count]);

  // Reset visibility when route or search focus changes
  useEffect(() => {
    hiddenRef.current = false;
    setScrollHidden(false);
    if (typeof window !== "undefined") {
      lastScrollYRef.current = Math.max(0, window.scrollY);
    }
  }, [pathname, searchFocus]);

  // Pinterest-style hide on scroll down, show on scroll up (passive + rAF)
  useEffect(() => {
    if (typeof window === "undefined") return;
    lastScrollYRef.current = Math.max(0, window.scrollY);
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const result = computeScrollVisibility({
          currentY: window.scrollY,
          lastY: lastScrollYRef.current,
          viewportHeight: window.innerHeight,
          documentHeight: document.documentElement.scrollHeight,
          currentlyHidden: hiddenRef.current,
        });

        lastScrollYRef.current = result.nextLastY;
        if (result.hidden !== hiddenRef.current) {
          hiddenRef.current = result.hidden;
          setScrollHidden(result.hidden);
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hide when virtual keyboard / input is focused on mobile
  useEffect(() => {
    if (typeof document === "undefined") return;

    const isTextInput = (el: Element | null): boolean => {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "TEXTAREA" || tag === "SELECT") return true;
      if (tag === "INPUT") {
        const type = ((el as HTMLInputElement).type || "text").toLowerCase();
        const nonKeyboardTypes = new Set([
          "button",
          "checkbox",
          "color",
          "file",
          "hidden",
          "image",
          "radio",
          "range",
          "reset",
          "submit",
        ]);
        return !nonKeyboardTypes.has(type);
      }
      return (el as HTMLElement).isContentEditable === true;
    };

    const onFocusIn = (e: FocusEvent) => {
      if (isTextInput(e.target as Element | null)) {
        setKeyboardOpen(true);
      }
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        setKeyboardOpen(isTextInput(document.activeElement));
      }, 80);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // Hide when a modal dialog or mobile drawer is open
  useEffect(() => {
    if (typeof document === "undefined") return;

    const checkOverlays = () => {
      const openDialog = document.querySelector(
        '[role="dialog"][data-state="open"], [aria-modal="true"], [data-mobile-drawer="open"]',
      );
      setOverlayOpen(Boolean(openDialog));
    };

    checkOverlays();
    const observer = new MutationObserver(checkOverlays);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-modal", "data-mobile-drawer"],
    });

    return () => observer.disconnect();
  }, []);

  if (shouldHideMobileNavOnRoute(pathname)) {
    return null;
  }

  const isLoggedIn = mounted && isAuthenticated && Boolean(user);
  const activeTab = getActiveMobileTab(pathname, searchFocus);
  const badgeText = formatCartBadgeCount(count);
  const isLight = mounted && theme === "light";

  const tabs: TabDefinition[] = [
    { key: "home", label: "Home", to: "/" },
    { key: "shop", label: "Shop", to: "/shop" },
    { key: "search", label: "Search", to: "/shop", search: { focus: "search" } },
    { key: "cart", label: "Cart", to: "/cart" },
    {
      key: "profile",
      label: "Profile",
      to: isLoggedIn ? "/dashboard" : "/login",
    },
  ];

  const isNavHidden = scrollHidden || keyboardOpen || overlayOpen;

  const handleTabPress = (tab: TabDefinition) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(8);
      } catch {
        // ignore vibration permission errors
      }
    }

    if (tab.key === "search") {
      navigate({ to: "/shop", search: { focus: "search" } });
      return;
    }

    if (tab.key === "shop") {
      navigate({ to: "/shop", search: {} });
      return;
    }

    navigate({ to: tab.to });
  };

  const renderTabIcon = (key: MobileNavTabKey, isActive: boolean) => {
    if (key === "home") {
      return <Home size={24} strokeWidth={1.8} aria-hidden="true" />;
    }
    if (key === "shop") {
      return <ShoppingBag size={24} strokeWidth={1.8} aria-hidden="true" />;
    }
    if (key === "search") {
      return <Search size={24} strokeWidth={1.8} aria-hidden="true" />;
    }
    if (key === "cart") {
      return (
        <span className="relative inline-flex items-center justify-center">
          <ShoppingCart size={24} strokeWidth={1.8} aria-hidden="true" />
          {badgeText !== null && (
            <span
              data-testid="mobile-nav-cart-badge"
              className="pointer-events-none absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold text-white"
              style={{
                backgroundColor: "#10b981",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.55)",
                transform: badgePop ? "scale(1.3)" : "scale(1)",
                transition: reducedMotion
                  ? "none"
                  : "transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {badgeText}
            </span>
          )}
        </span>
      );
    }

    // Profile tab
    if (isLoggedIn && user) {
      if (user.photoURL && !avatarError) {
        return (
          <img
            src={user.photoURL}
            alt={user.name || "Profile"}
            onError={() => setAvatarError(true)}
            className="h-6 w-6 rounded-full object-cover"
            style={{
              border: isActive
                ? "1.5px solid #10b981"
                : isLight
                  ? "1.5px solid rgba(0, 0, 0, 0.25)"
                  : "1.5px solid rgba(255, 255, 255, 0.45)",
            }}
          />
        );
      }

      const initial = (user.name || user.email || "U").trim().charAt(0).toUpperCase();

      return (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            border: isActive ? "1.5px solid #10b981" : "1.5px solid rgba(255, 255, 255, 0.45)",
          }}
          aria-hidden="true"
        >
          {initial}
        </span>
      );
    }

    return <CircleUser size={24} strokeWidth={1.8} aria-hidden="true" />;
  };

  return (
    <nav
      role="navigation"
      aria-label="Mobile bottom navigation"
      data-testid="mobile-bottom-nav"
      data-hidden={isNavHidden ? "true" : "false"}
      className="dds-mobile-glass-pill fixed left-3 right-3 z-50 h-16 max-w-[420px] sm:mx-auto rounded-full p-1 md:hidden select-none"
      style={{
        bottom: "calc(12px + env(safe-area-inset-bottom))",
        backgroundColor: isLight ? "rgba(255, 255, 255, 0.65)" : "rgba(10, 25, 30, 0.55)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: isLight ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(255, 255, 255, 0.14)",
        boxShadow: isLight
          ? "0 10px 40px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.7)"
          : "0 10px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        transform: isNavHidden ? "translateY(calc(100% + 24px))" : "translateY(0)",
        opacity: isNavHidden ? 0 : 1,
        pointerEvents: isNavHidden ? "none" : "auto",
        willChange: "transform, opacity",
        transition: reducedMotion
          ? "none"
          : "transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Subtle 1px top-edge glass specular highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full"
        style={{
          background: isLight
            ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent)",
        }}
      />

      <div className="relative flex h-full w-full items-center justify-between">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const inactiveColor = isLight ? "rgba(0, 0, 0, 0.55)" : "rgba(255, 255, 255, 0.65)";

          return (
            <button
              key={tab.key}
              type="button"
              data-testid={`mobile-nav-tab-${tab.key}`}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => handleTabPress(tab)}
              className="relative flex flex-1 h-full min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-full border-0 bg-transparent px-1.5 py-1 cursor-pointer select-none transition-transform duration-[120ms] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10b981]"
              style={{
                color: isActive ? "#10b981" : inactiveColor,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-pill"
                  data-testid="nav-active-pill"
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.18)",
                  }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 380, damping: 30 }
                  }
                />
              )}

              <span
                className="relative z-10 flex items-center justify-center"
                style={{
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                  transition: reducedMotion
                    ? "none"
                    : "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {renderTabIcon(tab.key, isActive)}
              </span>

              <span
                className="relative z-10 text-[11px] leading-tight font-semibold tracking-tight"
                style={{
                  color: isActive ? "#10b981" : inactiveColor,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      <style>{`
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .dds-mobile-glass-pill {
            background-color: ${
              isLight ? "rgba(255, 255, 255, 0.94)" : "rgba(10, 25, 30, 0.92)"
            } !important;
          }
        }
      `}</style>
    </nav>
  );
}
