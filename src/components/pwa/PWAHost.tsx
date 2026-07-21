import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { registerPWA } from "@/pwa/register";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "gmtl.pwa.install.dismissed";

export function PWAHost() {
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [update, setUpdate] = useState<null | (() => Promise<void>)>(null);
  const [online, setOnline] = useState(true);

  // Register service worker + capture update handler.
  useEffect(() => {
    registerPWA((reload) => setUpdate(() => reload));
  }, []);

  // Capture install prompt.
  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BIPEvent);
      if (typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY)) return;
      // Delay so it doesn't collide with hero animations.
      setTimeout(() => setShowInstall(true), 8000);
    };
    const onInstalled = () => {
      setShowInstall(false);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Online/offline banner.
  useEffect(() => {
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => null);
    setInstallEvent(null);
    setShowInstall(false);
  }

  function dismissInstall() {
    setShowInstall(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }

  return (
    <>
      {!online && (
        <div className="fixed inset-x-0 top-0 z-[70] bg-amber-500 py-1.5 text-center text-xs font-semibold text-black">
          You're offline — showing cached pages. Live prices, availability and admin actions need internet.
        </div>
      )}

      {update && (
        <div className="fixed inset-x-3 bottom-3 z-[65] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-lg md:inset-x-auto md:right-4 md:bottom-4">
          <RefreshCw className="h-5 w-5 flex-none text-primary" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-ink">A new version is available</div>
            <div className="text-xs text-muted-foreground">Reload to get the latest features.</div>
          </div>
          <button
            type="button"
            onClick={() => update()}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
          >
            Reload
          </button>
        </div>
      )}

      {showInstall && installEvent && (
        <div className="fixed inset-x-3 bottom-20 z-[64] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-lg md:inset-x-auto md:left-4 md:bottom-4">
          <Download className="h-5 w-5 flex-none text-primary" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-ink">Install Ghafoor Motors</div>
            <div className="text-xs text-muted-foreground">One-tap access to tyres, booking and WhatsApp.</div>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
          >
            Install
          </button>
          <button
            type="button"
            onClick={dismissInstall}
            aria-label="Dismiss"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
