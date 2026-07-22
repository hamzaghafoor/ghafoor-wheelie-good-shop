// Post-build prerender for static hosting (GitHub Pages).
// Loads the Nitro-emitted server bundle and invokes its `fetch(request, env, ctx)`
// for each route we want as static HTML. Results are written into the client
// output directory so GitHub Pages can serve them.
//
// Run with:  bun scripts/prerender.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROUTES = [
  "/",
  "/about",
  "/contact",
  "/services",
  "/tyres",
  "/lubricants",
  "/filters",
  "/additives",
  "/car-care",
  "/accessories",
  "/maintenance-parts",
  "/tyre-guide",
  "/blog",
  "/search",
  "/offline",
];
const ORIGIN = "https://gmtl.ink";

// Resolve the Nitro output layout. The TanStack Start + Nitro build emits:
//   dist/server/index.mjs   ← server entry (fetch handler)
//   dist/client/            ← static assets uploaded to GitHub Pages
//   dist/sw.js              ← PWA service worker (needs to be copied into client/)
//   dist/workbox-*.js       ← Workbox runtime (needs to be copied into client/)
const distDir = path.resolve("dist");
const clientDir = path.join(distDir, "client");
const serverEntry = path.join(distDir, "server", "index.mjs");

async function assertExists(p, label) {
  try {
    await fs.access(p);
  } catch {
    console.error(`Missing ${label}: ${p}`);
    process.exit(1);
  }
}

await assertExists(serverEntry, "server entry");
await assertExists(clientDir, "client output directory");

const mod = await import(pathToFileURL(serverEntry).href);
const handler = mod.default ?? mod;

if (typeof handler?.fetch !== "function") {
  console.error(`Server bundle at ${serverEntry} does not export a fetch handler.`);
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

// Copy PWA artifacts emitted at dist/ into the uploaded client directory.
const distEntries = await fs.readdir(distDir);
const pwaFiles = distEntries.filter(
  (name) => name === "sw.js" || /^workbox-[A-Za-z0-9]+\.js(\.map)?$/.test(name),
);
if (!pwaFiles.includes("sw.js")) {
  console.error(`Missing PWA service worker at ${path.join(distDir, "sw.js")}`);
  process.exit(1);
}
const workboxFile = pwaFiles.find((n) => /^workbox-[A-Za-z0-9]+\.js$/.test(n));
if (!workboxFile) {
  console.error(`Missing Workbox runtime (workbox-*.js) in ${distDir}`);
  process.exit(1);
}
for (const name of pwaFiles) {
  await fs.copyFile(path.join(distDir, name), path.join(clientDir, name));
  console.log(`  ✓ ${name}  →  ${path.relative(process.cwd(), path.join(clientDir, name))}`);
}

// Final verification — fail loudly if anything the workflow uploads is missing.
const required = [
  path.join(clientDir, "index.html"),
  path.join(clientDir, "sw.js"),
  path.join(clientDir, workboxFile),
];
for (const p of required) {
  await assertExists(p, "required upload artifact");
}
console.log(`\nUpload directory: ${path.relative(process.cwd(), clientDir)}`);
console.log(`  index.html, sw.js, ${workboxFile} verified.`);
