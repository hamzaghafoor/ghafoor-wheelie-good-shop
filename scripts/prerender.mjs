// Post-build prerender for static hosting (GitHub Pages).
// Loads the Cloudflare-Worker–style server bundle emitted at dist/server/index.mjs
// and invokes its `fetch(request, env, ctx)` for each route we want as static HTML.
// The resulting HTML is written into dist/client/ so GitHub Pages can serve it.
//
// Run with:  bun scripts/prerender.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROUTES = ["/", "/about", "/products", "/contact"];
const ORIGIN = "https://gmtl.ink";

const clientDir = path.resolve("dist/client");
const serverEntry = path.resolve("dist/server/index.mjs");

const mod = await import(pathToFileURL(serverEntry).href);
const handler = mod.default ?? mod;

if (typeof handler?.fetch !== "function") {
  console.error("Server bundle at dist/server/index.mjs does not export a fetch handler.");
  process.exit(1);
}

async function prerender(route) {
  const url = new URL(route, ORIGIN).toString();
  const req = new Request(url, { method: "GET", headers: { accept: "text/html" } });
  const ctx = { waitUntil() {}, passThroughOnException() {}, context: { waitUntil() {} } };
  const res = await handler.fetch(req, {}, ctx);
  if (!res.ok) {
    throw new Error(`Prerender ${route} failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const outPath =
    route === "/"
      ? path.join(clientDir, "index.html")
      : path.join(clientDir, route.replace(/^\//, ""), "index.html");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, html, "utf8");
  console.log(`  ✓ ${route}  →  ${path.relative(process.cwd(), outPath)}`);
}

console.log("Prerendering routes to dist/client/…");
for (const route of ROUTES) {
  await prerender(route);
}

// SPA fallback for GitHub Pages: unknown paths fall back to the home page,
// which lets client-side routing take over.
await fs.copyFile(path.join(clientDir, "index.html"), path.join(clientDir, "404.html"));
console.log("  ✓ 404.html (SPA fallback)");
