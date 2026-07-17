// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Prerender all pages to static HTML for GitHub Pages hosting.
    prerender: {
      enabled: true,
      crawlLinks: true,
    },
    pages: [
      { path: "/" },
      { path: "/about" },
      { path: "/products" },
      { path: "/contact" },
    ],
  },
  // Build as a static site (Nitro `static` preset) so `.output/public/` contains
  // real index.html files that GitHub Pages can serve directly.
  nitro: {
    preset: "static",
  },
});
