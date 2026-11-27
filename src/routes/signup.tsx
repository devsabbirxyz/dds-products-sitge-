import { createFileRoute, redirect } from "@tanstack/react-router";
import { DIGISTORE_CONFIG } from "@/config/auth-config";
import { AuthPage } from "@/components/digistore/AuthPage";
import { supabase } from "@/integrations/supabase/client";

function safeNext(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: `Create Account — ${DIGISTORE_CONFIG.siteName}` },
      {
        name: "description",
        content: `Join ${DIGISTORE_CONFIG.siteName} today to access your secure workspace.`,
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    next:
      typeof s.next === "string"
        ? s.next
        : typeof s.redirect === "string"
          ? s.redirect
          : undefined,
  }),
  beforeLoad: async ({ search }) => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        throw redirect({ href: safeNext(search.next) } as never);
      }
    } catch (e) {
      if (e && typeof e === "object" && "isRedirect" in e) throw e;
    }
  },
  component: SignUpPageRoute,
});

function SignUpPageRoute() {
  const search = Route.useSearch();
  const dest = safeNext(search.next);
  return <AuthPage mode="signup" redirectUrl={dest} />;
}
