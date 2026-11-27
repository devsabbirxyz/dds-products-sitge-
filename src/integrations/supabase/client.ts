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

function getEnvVar(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
}

function createCustomFetch(supabaseUrl: string) {
  const baseOrigin = new URL(supabaseUrl).origin;

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
      if (parsed.origin === baseOrigin && parsed.pathname.startsWith("/rest/v1/")) {
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

        if (typeof window !== "undefined") {
          const proxyUrl = `${window.location.origin}/api/supabase-rest${parsed.pathname}${parsed.search}`;
          return fetch(proxyUrl, init);
        } else {
          const serviceKey =
            getEnvVar("SUPABASE_SERVICE_ROLE_KEY") ||
            getEnvVar("SUPABASE_PUBLISHABLE_KEY") ||
            getEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY") ||
            DEFAULT_SUPABASE_ANON_KEY;
          if (serviceKey) {
            const headers = new Headers(init?.headers);
            headers.set("apikey", serviceKey);
            headers.set("Authorization", `Bearer ${serviceKey}`);
            return fetch(cleanedUrl, { ...init, headers });
          }
        }
      }
    } catch {
      // Fall through to standard fetch
    }

    return fetch(cleanedUrl, init);
  };
}

function createSupabaseClient() {
  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL ||
    getEnvVar("VITE_SUPABASE_URL") ||
    getEnvVar("SUPABASE_URL") ||
    DEFAULT_SUPABASE_URL;

  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    getEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    getEnvVar("SUPABASE_PUBLISHABLE_KEY") ||
    DEFAULT_SUPABASE_ANON_KEY;

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      fetch: createCustomFetch(SUPABASE_URL),
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
