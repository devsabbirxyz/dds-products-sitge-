import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nContext, translations, type Lang, type TKey } from "@/lib/i18n";
import { ThemeContext, type Theme } from "@/lib/theme";
import { AuthContext, type AuthUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CartProvider } from "@/lib/cart";
import { WishlistProvider } from "@/lib/wishlist";
import { CompareProvider } from "@/lib/compare";
import { Toaster } from "@/components/ui/sonner";
import { ModalDialogHost } from "@/components/ui/modal-dialogs";

export function AppProviders({ children }: { children: ReactNode }) {
  // ---- Theme (dark default) ----
  const [theme, setThemeState] = useState<Theme>("dark");
  useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      localStorage.getItem("dds-theme")) as Theme | null;
    const next: Theme = stored === "light" ? "light" : "dark";
    setThemeState(next);
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    if (typeof window !== "undefined") localStorage.setItem("dds-theme", t);
  }, []);

  // ---- Language (Bangla only — English version removed) ----
  const lang: Lang = "bn";
  const setLang = useCallback((_l: Lang) => {
    // English is disabled site-wide; language is locked to Bangla.
  }, []);
  const t = useCallback((k: TKey) => translations.bn[k] ?? String(k), []);

  // ---- Auth ----
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local DigiStore session first
    const checkLocal = () => {
      try {
        const raw = localStorage.getItem("digistore_user");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.id) {
            setUser({
              id: parsed.id,
              email: parsed.email || "",
              name: parsed.displayName,
              photoURL: parsed.photoURL,
              provider: parsed.provider,
              phoneNumber: parsed.phoneNumber,
            });
            return true;
          }
        }
      } catch {}
      return false;
    };

    const hasLocal = checkLocal();

    // Listen to custom digistore_auth_state_changed event
    const handleDigiStoreAuth = (e: Event) => {
      const customEvt = e as CustomEvent;
      const detail = customEvt.detail;
      if (detail && detail.id) {
        setUser({
          id: detail.id,
          email: detail.email || "",
          name: detail.displayName,
          photoURL: detail.photoURL,
          provider: detail.provider,
          phoneNumber: detail.phoneNumber,
        });
      } else {
        checkLocal();
      }
    };
    window.addEventListener("digistore_auth_state_changed", handleDigiStoreAuth);

    // Set Supabase listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          name:
            (session.user.user_metadata?.full_name as string) ||
            (session.user.email ? session.user.email.split("@")[0] : undefined),
          photoURL: (session.user.user_metadata?.avatar_url as string) || undefined,
        });
      } else if (!checkLocal()) {
        setUser(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email ?? "",
          name:
            (data.session.user.user_metadata?.full_name as string) ||
            (data.session.user.email ? data.session.user.email.split("@")[0] : undefined),
          photoURL: (data.session.user.user_metadata?.avatar_url as string) || undefined,
        });
      } else if (!hasLocal) {
        checkLocal();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("digistore_auth_state_changed", handleDigiStoreAuth);
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.removeItem("digistore_user");
      window.dispatchEvent(new CustomEvent("digistore_auth_state_changed", { detail: null }));
    } catch {}
    setUser(null);
  }, []);

  const themeValue = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  const i18nValue = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  const authValue = useMemo(
    () => ({ user, loading, signOut, isAuthenticated: !!user }),
    [user, loading, signOut],
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <I18nContext.Provider value={i18nValue}>
        <AuthContext.Provider value={authValue}>
          <CartProvider>
            <WishlistProvider>
              <CompareProvider>{children}</CompareProvider>
            </WishlistProvider>
          </CartProvider>
          <Toaster />
          <ModalDialogHost />
        </AuthContext.Provider>
      </I18nContext.Provider>
    </ThemeContext.Provider>
  );
}
