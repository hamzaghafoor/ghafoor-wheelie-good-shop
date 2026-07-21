import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { listCatalogueSettingsPublic } from "@/lib/catalogue-cms.functions";
import { track } from "@/lib/analytics";

export type BookingSettings = {
  booking_enabled: boolean;
  default_calendly_url: string | null;
  service_calendly_links: Record<string, string>;
};

export function useBookingSettings() {
  const load = useServerFn(listCatalogueSettingsPublic);
  const q = useQuery({
    queryKey: ["public-catalogue-settings"],
    queryFn: () => load(),
    staleTime: 60_000,
  });
  const s = q.data as any;
  const settings: BookingSettings = {
    booking_enabled: !!s?.booking_enabled,
    default_calendly_url: s?.default_calendly_url ?? null,
    service_calendly_links: (s?.service_calendly_links as Record<string, string>) ?? {},
  };
  return { ...settings, isLoading: q.isLoading };
}

/** Resolve a Calendly URL for an optional service key, falling back to default. */
export function resolveCalendlyUrl(s: BookingSettings, serviceKey?: string | null): string | null {
  if (!s.booking_enabled) return null;
  if (serviceKey && s.service_calendly_links[serviceKey]) return s.service_calendly_links[serviceKey];
  return s.default_calendly_url || null;
}

let calendlyLoader: Promise<void> | null = null;
export function loadCalendly(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).Calendly) return Promise.resolve();
  if (calendlyLoader) return calendlyLoader;
  calendlyLoader = new Promise<void>((resolve, reject) => {
    // CSS
    if (!document.querySelector("link[data-calendly]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://assets.calendly.com/assets/external/widget.css";
      link.setAttribute("data-calendly", "1");
      document.head.appendChild(link);
    }
    // JS
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Calendly"));
    document.body.appendChild(script);
  });
  return calendlyLoader;
}

export type CalendlyContext = Record<string, string | number | undefined | null>;

/** Open Calendly in a popup. Returns true if launched. */
export async function openBookingPopup(url: string, context: CalendlyContext = {}) {
  if (typeof window === "undefined" || !url) return false;
  try {
    await loadCalendly();
    const utm: Record<string, string> = {};
    for (const [k, v] of Object.entries(context)) {
      if (v == null || v === "") continue;
      utm[`utm_${k}`] = String(v).slice(0, 200);
    }
    track("booking_started", { url, ...context }).catch(() => {});
    (window as any).Calendly?.initPopupWidget({
      url,
      utm,
    });
    return true;
  } catch (e) {
    // Fallback: open in new tab.
    window.open(url, "_blank", "noopener");
    return true;
  }
}

/** Global listener for Calendly event_scheduled postMessage → booking_completed. */
export function useCalendlyCompletionTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMessage = (e: MessageEvent) => {
      const d: any = e.data;
      if (d && typeof d === "object" && typeof d.event === "string" && d.event.indexOf("calendly.") === 0) {
        if (d.event === "calendly.event_scheduled") {
          track("booking_completed", { payload: d.payload ?? null }).catch(() => {});
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
}
