import "./lib/error-capture";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  sanitizeSupabaseRestUrl,
  getRestTableOrRpc,
  isUnmigratedTable,
} from "./lib/supabase-rest-sanitizer";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }
  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }
  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

async function handleSupabaseRestProxy(request: Request): Promise<Response> {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL ||
    "https://zazurmsortaoyopjgjxl.supabase.co";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphenVybXNvcnRhb3lvcGpnanhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDgzMjcsImV4cCI6MjA5NTAyNDMyN30.SSUIqdPKEfIqdkhCjav64zmawFSoEtULhD_x6VP0pzQ";

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const reqUrl = new URL(request.url);
  const restPath = reqUrl.pathname.replace(/^\/api\/supabase-rest/, "");
  const info = getRestTableOrRpc(restPath);

  if (info.type === "table" && isUnmigratedTable(info.name)) {
    if (request.method === "GET" || request.method === "HEAD") {
      return new Response(request.method === "HEAD" ? null : JSON.stringify([]), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-range": "0-0/0",
        },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const targetUrl = sanitizeSupabaseRestUrl(
    `${supabaseUrl.replace(/\/$/, "")}${restPath}${reqUrl.search}`,
  );

  const headers = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const lower = k.toLowerCase();
    if (
      lower === "host" ||
      lower === "connection" ||
      lower === "content-length" ||
      lower === "apikey" ||
      lower === "authorization"
    ) {
      continue;
    }
    headers.set(k, v);
  }
  headers.set("apikey", serviceKey);
  headers.set("Authorization", `Bearer ${serviceKey}`);

  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.arrayBuffer()
      : undefined;

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  if (!upstream.ok && info.type === "rpc" && info.name === "recent_sales_count") {
    return new Response(JSON.stringify(0), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if ((upstream.status === 400 || upstream.status === 404) && request.method === "GET") {
    const accept = request.headers.get("accept") || "";
    const bodyText = accept.includes("vnd.pgrst.object") ? "null" : "[]";
    return new Response(bodyText, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const resHeaders = new Headers();
  for (const [k, v] of upstream.headers.entries()) {
    const lower = k.toLowerCase();
    if (lower === "content-encoding" || lower === "transfer-encoding") continue;
    resHeaders.set(k, v);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

import { handleOtpAuthHttpRequest } from "./lib/otp-backend-handler";

function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/auth/otp/")) {
        return applySecurityHeaders(await handleOtpAuthHttpRequest(request));
      }
      if (url.pathname.startsWith("/api/supabase-rest/")) {
        return applySecurityHeaders(await handleSupabaseRestProxy(request));
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applySecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      return applySecurityHeaders(brandedErrorResponse());
    }
  },
};

