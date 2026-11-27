import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const clientDir = path.join(distDir, "client");
const serverEntryPath = path.join(distDir, "server", "server.js");

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function run() {
  try {
    // 1. Copy dist/client/* to dist/* so static assets exist at both dist/client and dist/
    if (fs.existsSync(clientDir)) {
      copyDirRecursive(clientDir, distDir);
    }

    // 2. Render index.html from the built SSR entry so dist/index.html exists for static checks/fallbacks
    if (fs.existsSync(serverEntryPath)) {
      const mod = await import(pathToFileURL(serverEntryPath).href);
      const srv = mod.default ?? mod;
      const res = await srv.fetch(new Request("http://localhost:3000/"), process.env, {});
      const html = await res.text();
      if (html && html.includes("<html")) {
        fs.writeFileSync(path.join(distDir, "index.html"), html, "utf-8");
        if (fs.existsSync(clientDir)) {
          fs.writeFileSync(path.join(clientDir, "index.html"), html, "utf-8");
        }
        console.log("[postbuild] Generated dist/index.html successfully.");
      }
    }
  } catch (err) {
    console.warn("[postbuild] Warning:", err);
  } finally {
    process.exit(0);
  }
}

run();
