// Guarded service-worker registration wrapper.
// Refuses registration in dev, iframes, Lovable preview hosts, and when ?sw=off is set.
// Uses vite-plugin-pwa's virtual `registerSW` helper via workbox-window under the hood.

const SW_URL = "/sw.js";

function isPreviewOrDevHost(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  }
  return false;
}

async function unregisterMatching() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => {
        const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
        return url.endsWith(SW_URL);
      })
      .map((r) => r.unregister()),
  );
}

export type PWAUpdateHandler = (reload: () => Promise<void>) => void;

export async function registerPWA(onUpdate?: PWAUpdateHandler): Promise<void> {
  if (typeof window === "undefined") return;
  if (isPreviewOrDevHost()) {
    await unregisterMatching();
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox(SW_URL);

    wb.addEventListener("waiting", () => {
      onUpdate?.(async () => {
        wb.addEventListener("controlling", () => window.location.reload());
        await wb.messageSkipWaiting();
      });
    });

    await wb.register();
  } catch (err) {
    // Swallow — SW registration must never break the app.
    console.warn("[pwa] registration failed", err);
  }
}
