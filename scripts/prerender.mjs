// Post-build prerender for static hosting (GitHub Pages).
// Loads the Nitro-emitted server bundle and invokes its `fetch(request, env, ctx)`
// for each route we want as static HTML. Results are written into the client
// output directory so GitHub Pages can serve them.
//
// Run with:  bun scripts/prerender.mjs

import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
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
//   .output/server/index.mjs   ← server entry (fetch handler)
//   .output/public/            ← generated static assets
// GitHub Pages uploads dist/client/, so the static and PWA output is assembled there.
const distDir = path.resolve("dist");
const clientDir = path.join(distDir, "client");
const outputDir = path.resolve(".output");
const staticOutputDir = path.join(outputDir, "public");
const serverEntryCandidates = [
  path.join(outputDir, "server", "index.mjs"),
  path.join(distDir, "server", "index.mjs"),
];
const serverEntry = serverEntryCandidates.find((candidate) => existsSync(candidate));

if (!serverEntry) {
  throw new Error(
    `Nitro server entry was not found. Checked:\n${serverEntryCandidates
      .map((candidate) => `  - ${candidate}`)
      .join("\n")}`,
  );
}

async function assertExists(p, label) {
  try {
    await fs.access(p);
  } catch {
    console.error(`Missing ${label}: ${p}`);
    process.exit(1);
  }
}

await assertExists(staticOutputDir, "Nitro static output directory");
await fs.mkdir(clientDir, { recursive: true });
await fs.cp(staticOutputDir, clientDir, { recursive: true, force: true });
console.log(
  `Copied static output: ${path.relative(process.cwd(), staticOutputDir)} → ${path.relative(process.cwd(), clientDir)}`,
);

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

// Copy PWA artifacts into the uploaded client directory. They normally live in
// .output/public, but also check .output for compatibility with the PWA emitter.
const pwaSourceDirs = [staticOutputDir, outputDir];
const pwaSources = [];
for (const sourceDir of pwaSourceDirs) {
  if (!existsSync(sourceDir)) continue;
  for (const name of await fs.readdir(sourceDir)) {
    if (name === "sw.js" || /^workbox-[A-Za-z0-9]+\.js(\.map)?$/.test(name)) {
      if (!pwaSources.some((entry) => entry.name === name)) {
        pwaSources.push({ name, sourceDir });
      }
    }
  }
}
if (!pwaSources.some(({ name }) => name === "sw.js")) {
  throw new Error(
    `Missing PWA service worker. Checked:\n${pwaSourceDirs.map((dir) => `  - ${path.join(dir, "sw.js")}`).join("\n")}`,
  );
}
const workboxFile = pwaSources.find(({ name }) => /^workbox-[A-Za-z0-9]+\.js$/.test(name))?.name;
if (!workboxFile) {
  throw new Error(
    `Missing Workbox runtime (workbox-*.js). Checked:\n${pwaSourceDirs.map((dir) => `  - ${dir}`).join("\n")}`,
  );
}
for (const { name, sourceDir } of pwaSources) {
  const source = path.join(sourceDir, name);
  const destination = path.join(clientDir, name);
  if (path.resolve(source) !== path.resolve(destination)) {
    await fs.copyFile(source, destination);
  }
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
