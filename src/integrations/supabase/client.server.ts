import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import {
  sanitizeSupabaseRestUrl,
  getRestTableOrRpc,
  isUnmigratedTable,
} from "@/lib/supabase-rest-sanitizer";

const DEFAULT_SUPABASE_URL = "https://zazurmsortaoyopjgjxl.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphenVybXNvcnRhb3lvcGpnanhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDgzMjcsImV4cCI6MjA5NTAyNDMyN30.SSUIqdPKEfIqdkhCjav64zmawFSoEtULhD_x6VP0pzQ";

function createServerAdminFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const cleanedUrl = sanitizeSupabaseRestUrl(rawUrl);
    try {
      const parsed = new URL(cleanedUrl);
      const info = getRestTableOrRpc(parsed.pathname);
      const method = init?.method?.toUpperCase() || "GET";
      if (info.type === "table" && isUnmigratedTable(info.name)) {
        return new Response(method === "HEAD" ? null : JSON.stringify([]), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "content-range": "0-0/0",
          },
        });
      }
    } catch {
      // ignore
    }
    return fetch(cleanedUrl, init);
  };
}

function createSupabaseAdminClient() {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: createServerAdminFetch(),
    },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
