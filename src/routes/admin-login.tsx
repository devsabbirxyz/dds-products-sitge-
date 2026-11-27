import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAuthState, ensureMasterAdminServer } from "@/lib/admin.functions";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin Login — DDS-Digital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      const authState = await getAdminAuthState().catch(() => null);
      if (authState?.ok) throw redirect({ to: "/admin" });
    }
  },
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const getAuthState = useServerFn(getAdminAuthState);
  const ensureMasterAdmin = useServerFn(ensureMasterAdminServer);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const uname = username.trim().toLowerCase();

    // 1. Ensure master admin account is provisioned and active in Supabase
    let resolvedEmail = uname.includes("@") ? uname : `${uname}@dds.local`;
    try {
      const syncRes = await ensureMasterAdmin({
        data: { usernameOrEmail: uname, password },
      });
      if (syncRes?.synced && syncRes.email) {
        resolvedEmail = syncRes.email;
      }
    } catch {
      // Fallback to direct sign-in
    }

    // 2. Sign in via Supabase Auth
    let { data, error: signErr } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    // 3. If account doesn't exist yet on Supabase and matches a master credential, sign up on the fly
    if (
      (signErr || !data.user) &&
      ((uname === "dds" && password === "dds12345") ||
        (uname === "admin" && password === "admin12345") ||
        ((uname === "sabbir" || uname === "developersabbir.biz@gmail.com") &&
          password === "sabbir12345"))
    ) {
      const targetEmail =
        uname === "sabbir" || uname === "developersabbir.biz@gmail.com"
          ? "developersabbir.biz@gmail.com"
          : `${uname}@dds.local`;

      const { data: signUpData } = await supabase.auth.signUp({
        email: targetEmail,
        password,
        options: {
          data: { full_name: "Super Admin" },
        },
      });

      if (signUpData?.session) {
        data = { user: signUpData.user, session: signUpData.session };
        signErr = null;
      } else {
        const retry = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });
        data = retry.data;
        signErr = retry.error;
      }
    }

    if (signErr || !data.user) {
      setLoading(false);
      setError("ভুল ইউজারনেম বা পাসওয়ার্ড");
      return;
    }

    const authState = await getAuthState().catch(() => null);
    setLoading(false);
    if (!authState?.ok) {
      await supabase.auth.signOut();
      setError("এই অ্যাকাউন্টে এডমিন অ্যাক্সেস নেই");
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-12 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-glow opacity-70 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="relative w-full max-w-md glass-card rounded-3xl p-8 shadow-elegant">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-brand grid place-items-center shadow-glow mb-3">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-2xl">Admin Login</h1>
          <p className="text-sm text-muted-foreground mt-1">শুধুমাত্র এডমিনদের জন্য</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">
              Username or Email
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin বা dds"
              required
              autoComplete="username"
              autoFocus
              className="w-full rounded-xl glass border border-glass-border bg-input/40 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">
              Password
            </span>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-xl glass border border-glass-border bg-input/40 px-4 py-2.5 pr-11 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-brand px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] transition disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
