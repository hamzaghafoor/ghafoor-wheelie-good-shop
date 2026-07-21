// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        manifestFilename: "manifest.webmanifest",
        devOptions: { enabled: false },
        includeAssets: ["favicon.ico", "icons/apple-touch-icon.png"],
        manifest: {
          name: "Ghafoor Motors Tyres & Lubricants",
          short_name: "GMTL",
          description:
            "Find tyres, lubricants and auto-care services at Ghafoor Motors, Karachi. WhatsApp, call or book appointments in one tap.",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#0B0B0C",
          theme_color: "#F47A20",
          categories: ["shopping", "business", "utilities"],
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          navigateFallback: "/offline",
          // Never serve cached HTML for admin, auth, or API routes.
          navigateFallbackDenylist: [
            /^\/admin/,
            /^\/auth/,
            /^\/reset-password/,
            /^\/api\//,
            /^\/_serverFn\//,
            /^\/__/,
            /^\/sitemap\.xml/,
          ],
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          runtimeCaching: [
            {
              // Never cache admin, auth, API, or server-fn traffic.
              urlPattern: ({ url }) =>
                url.pathname.startsWith("/admin") ||
                url.pathname.startsWith("/auth") ||
                url.pathname.startsWith("/reset-password") ||
                url.pathname.startsWith("/api/") ||
                url.pathname.startsWith("/_serverFn/") ||
                url.hostname.endsWith("supabase.co"),
              handler: "NetworkOnly",
            },
            {
              // HTML page navigations — always fresh, fall back to cache if offline.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              // Google Fonts stylesheets.
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "StaleWhileRevalidate",
              options: { cacheName: "google-fonts-stylesheets" },
            },
            {
              // Google Fonts webfonts.
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Same-origin images (product photos, icons, etc.).
              urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === "image",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "images",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
