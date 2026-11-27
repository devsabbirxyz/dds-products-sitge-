import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, X, ShoppingCart, User, PackageSearch } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { siteSettingsQuery } from "@/lib/site-settings";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { InstantSearch } from "@/components/storefront/InstantSearch";
import { TrackOrderModal } from "@/components/storefront/TrackOrderModal";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const { isAuthenticated, user } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackInitialQuery, setTrackInitialQuery] = useState<string | undefined>(undefined);
  const { data: settings } = useQuery(siteSettingsQuery);
  const logoUrl = settings?.site_logo_url;
  const siteName = settings?.site_name || "DDS-Digital";

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string | undefined>).detail;
      if (detail) setTrackInitialQuery(detail);
      setTrackOpen(true);
    };
    window.addEventListener("dds:open-track-order", handler);
    return () => window.removeEventListener("dds:open-track-order", handler);
  }, []);

  const navItems: { to: string; label: string }[] = [
    { to: "/", label: t("nav_home") },
    { to: "/shop", label: t("nav_shop") },
    { to: "/blog", label: t("nav_blog") },
    { to: "/about", label: t("nav_about") },
    { to: "/developer", label: t("nav_developer") },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 glass border-b border-glass-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3.5 sm:px-6">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-2.5 group shrink-0"
            aria-label="DDS-Digital হোম"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${siteName} লোগো`}
                className="h-8 sm:h-9 w-auto max-w-[130px] sm:max-w-[140px] object-contain"
              />
            ) : (
              <BrandLogo siteName={siteName} subtitle="Digital Store" compact />
            )}
          </Link>

          {/* Nav links — tablet & desktop */}
          <nav className="hidden md:flex items-center gap-3.5 lg:gap-6 flex-1 justify-center px-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-xs lg:text-sm font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap"
                activeProps={{ className: "text-primary font-semibold" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right cluster (lg+) */}
          <div className="hidden lg:flex items-center gap-2">
            <InstantSearch className="w-52 xl:w-72" />

            <button
              type="button"
              onClick={() => {
                setTrackInitialQuery(undefined);
                setTrackOpen(true);
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-bold glass hover:bg-accent transition inline-flex items-center gap-1.5 border border-primary/30 text-foreground whitespace-nowrap"
            >
              <PackageSearch className="h-3.5 w-3.5 text-primary" />
              অর্ডার ট্র্যাক
            </button>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg p-2 glass hover:bg-accent transition"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to="/cart"
              className="relative rounded-lg p-2 glass hover:bg-accent transition"
              aria-label="Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-brand px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
            <NotificationBell />
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="rounded-lg p-1.5 glass hover:bg-accent transition inline-flex items-center gap-2"
                aria-label="Dashboard"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.name || "Profile"}
                    className="h-6 w-6 rounded-md object-cover border border-primary/40"
                  />
                ) : (
                  <User className="h-4 w-4 m-0.5" />
                )}
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-gradient-brand px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:scale-105 transition whitespace-nowrap"
              >
                {t("nav_login")}
              </Link>
            )}
          </div>

          {/* Mobile & Tablet right cluster (<lg) */}
          <div className="lg:hidden flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => {
                setTrackInitialQuery(undefined);
                setTrackOpen(true);
              }}
              className="rounded-lg px-2 sm:px-2.5 py-1.5 text-[11px] font-bold glass inline-flex items-center gap-1 border border-primary/30 whitespace-nowrap"
              aria-label="অর্ডার ট্র্যাক"
            >
              <PackageSearch className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>ট্র্যাক</span>
            </button>
            <Link
              to="/cart"
              className="hidden sm:inline-flex relative rounded-lg p-2 glass hover:bg-accent transition"
              aria-label="Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-brand px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hidden sm:inline-flex rounded-lg p-2 glass hover:bg-accent transition"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationBell />
            <button
              onClick={() => setOpen(!open)}
              className="rounded-lg p-2 glass hover:bg-accent transition"
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet drawer (<lg) */}
        {open && (
          <div data-mobile-drawer="open" className="lg:hidden glass border-t border-glass-border">
            <div className="mx-auto max-w-7xl space-y-2 px-3.5 sm:px-6 py-3.5">
              <InstantSearch className="w-full" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setTrackInitialQuery(undefined);
                  setTrackOpen(true);
                }}
                className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-accent flex items-center gap-2"
              >
                <PackageSearch className="h-4 w-4" /> অর্ডার ট্র্যাক করুন (Track Order)
              </button>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold glass flex items-center justify-center gap-2"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center rounded-lg bg-gradient-brand px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-glow"
                  >
                    ড্যাশবোর্ড
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center rounded-lg bg-gradient-brand px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-glow"
                  >
                    {t("nav_login")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <TrackOrderModal
        open={trackOpen}
        onClose={() => setTrackOpen(false)}
        initialQuery={trackInitialQuery}
      />
    </>
  );
}
