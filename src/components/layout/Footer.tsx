import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Facebook, Instagram, Youtube, Send, MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { siteSettingsQuery, HOMEPAGE_KEYS } from "@/lib/site-settings";
import { BrandLogo, CircledBrandText } from "@/components/layout/BrandLogo";
import logoBkash from "@/assets/pay-bkash.png";
import logoNagad from "@/assets/pay-nagad.png";
import logoRocket from "@/assets/pay-rocket.png";
import logoUpay from "@/assets/pay-upay.png";

export function Footer() {
  const { t } = useI18n();
  const { data: settings = {} } = useQuery(siteSettingsQuery);

  const about = settings[HOMEPAGE_KEYS.footer_about] || t("tagline");
  const copyright =
    settings[HOMEPAGE_KEYS.footer_copyright] ||
    `© ${new Date().getFullYear()} DDS-Digital. ${t("rights")}.`;
  const logoUrl = settings[HOMEPAGE_KEYS.footer_logo_url] || "";
  const fb = settings[HOMEPAGE_KEYS.social_facebook];
  const ig = settings[HOMEPAGE_KEYS.social_instagram];
  const yt = settings[HOMEPAGE_KEYS.social_youtube];
  const tg = settings[HOMEPAGE_KEYS.social_telegram];
  const wa = settings[HOMEPAGE_KEYS.social_whatsapp];

  const payments = [
    { key: HOMEPAGE_KEYS.payment_bkash, label: "bKash", logo: logoBkash },
    { key: HOMEPAGE_KEYS.payment_nagad, label: "Nagad", logo: logoNagad },
    { key: HOMEPAGE_KEYS.payment_rocket, label: "Rocket", logo: logoRocket },
    { key: HOMEPAGE_KEYS.payment_upay, label: "Upay", logo: logoUpay },
  ].filter((p) => (settings[p.key] ?? "true") !== "false");

  return (
    <footer className="relative mt-14 sm:mt-20 border-t border-glass-border bg-surface">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-brand opacity-60" />
      <div className="mx-auto max-w-7xl px-3.5 sm:px-6 pt-10 sm:pt-12 pb-24 lg:pb-12">
        <div className="grid gap-8 sm:gap-10 sm:grid-cols-2 md:grid-cols-3">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="mb-3">
              {logoUrl ? (
                <div className="flex items-center gap-2.5">
                  <img
                    src={logoUrl}
                    alt="DDS-Digital"
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-400/50"
                  />
                  <div>
                    <CircledBrandText variant="nav" className="text-base">
                      DDS-Digital
                    </CircledBrandText>
                    <div className="text-[11px] text-muted-foreground pl-2.5 mt-0.5">
                      {t("brand_sub")}
                    </div>
                  </div>
                </div>
              ) : (
                <BrandLogo siteName="DDS-Digital" subtitle={t("brand_sub")} />
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {about}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {fb && (
                <a
                  href={fb}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="rounded-lg glass p-2 hover:bg-accent"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {ig && (
                <a
                  href={ig}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="rounded-lg glass p-2 hover:bg-accent"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {yt && (
                <a
                  href={yt}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="rounded-lg glass p-2 hover:bg-accent"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              )}
              {tg && (
                <a
                  href={tg}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Telegram"
                  className="rounded-lg glass p-2 hover:bg-accent"
                >
                  <Send className="h-4 w-4" />
                </a>
              )}
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="rounded-lg glass p-2 hover:bg-accent"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm sm:text-base">
              {t("foot_account")}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link to="/dashboard" className="hover:text-foreground transition">
                  {t("nav_dashboard")}
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-foreground transition">
                  {t("nav_shop")}
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-foreground transition">
                  {t("nav_login")}
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-foreground transition">
                  {t("nav_register")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Useful */}
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm sm:text-base">
              {t("foot_useful")}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link to="/about" className="hover:text-foreground transition">
                  {t("nav_about")}
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-foreground transition">
                  {t("nav_blog")}
                </Link>
              </li>
              <li>
                <Link to="/developer" className="hover:text-foreground transition">
                  {t("nav_developer")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground text-center sm:text-left">
          <div>{copyright}</div>
          {payments.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span>{t("foot_we_accept")}:</span>
              {payments.map((p) => (
                <span
                  key={p.label}
                  className="rounded-md bg-white px-2 py-1 inline-flex items-center"
                  title={p.label}
                >
                  <img
                    src={p.logo}
                    alt={p.label}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="h-5 w-auto object-contain"
                  />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
