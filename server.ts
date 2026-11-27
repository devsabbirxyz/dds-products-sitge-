import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.NGINX_PORT
  ? Number(process.env.DEFAULT_APP_PORT) || 3000
  : Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

const clientDistDir = path.resolve(__dirname, "dist", "client");
const rootDistDir = path.resolve(__dirname, "dist");
const publicDir = path.resolve(__dirname, "public");
const serverEntryPath = path.resolve(__dirname, "dist", "server", "server.js");

let ssrHandlerPromise: Promise<{
  fetch: (req: Request, env: unknown, ctx: unknown) => Promise<Response>;
}> | null = null;

function getSsrHandler() {
  if (!ssrHandlerPromise) {
    ssrHandlerPromise = import(pathToFileURL(serverEntryPath).href).then(
      (mod) => mod.default ?? mod
    );
  }
  return ssrHandlerPromise;
}

function resolveStaticFile(urlPathname: string): string | null {
  if (!urlPathname || urlPathname === "/") return null;
  const decoded = decodeURIComponent(urlPathname);
  // Prevent directory traversal
  const safeRel = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const cleanRel = safeRel.replace(/^[/\\]+/, "");
  if (!cleanRel || cleanRel.endsWith(".html")) return null;

  for (const baseDir of [clientDistDir, rootDistDir, publicDir]) {
    const candidate = path.join(baseDir, cleanRel);
    if (!candidate.startsWith(baseDir)) continue;
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) {
        return candidate;
      }
    } catch {
      // ignore missing file
    }
  }
  return null;
}

async function readRequestBody(req: http.IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  try {
    const hostHeader = req.headers.host || `localhost:${PORT}`;
    const protoHeader =
      (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() || "http";
    const rawUrl = req.url || "/";
    const fullUrl = new URL(rawUrl, `${protoHeader}://${hostHeader}`);

    // 1. Serve static files from dist/client or public
    if (req.method === "GET" || req.method === "HEAD") {
      const staticFile = resolveStaticFile(fullUrl.pathname);
      if (staticFile && path.basename(staticFile) !== "server.js") {
        const ext = path.extname(staticFile).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        const stat = fs.statSync(staticFile);
        const isHashedAsset = fullUrl.pathname.startsWith("/assets/");

        res.writeHead(200, {
          "Content-Type": contentType,
          "Content-Length": stat.size,
          "Cache-Control": isHashedAsset
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600",
        });

        if (req.method === "HEAD") {
          res.end();
          return;
        }

        fs.createReadStream(staticFile).pipe(res);
        return;
      }
    }

    // 2. Forward to TanStack Start SSR & Server Functions handler
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    const bodyBuffer = await readRequestBody(req);
    const webReq = new Request(fullUrl.toString(), {
      method: req.method || "GET",
      headers,
      body: bodyBuffer ? new Uint8Array(bodyBuffer) : undefined,
    });

    const handler = await getSsrHandler();
    const webRes = await handler.fetch(webReq, process.env, {});

    const responseHeaders: Record<string, string | string[]> = {};
    webRes.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    res.writeHead(webRes.status, responseHeaders);

    if (req.method === "HEAD" || !webRes.body) {
      res.end();
      return;
    }

    const arrayBuf = await webRes.arrayBuffer();
    res.end(Buffer.from(arrayBuf));
  } catch (err) {
    console.error("[Server Error]:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
