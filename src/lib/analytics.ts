import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEvent =
  | "tyre_size_search"
  | "vehicle_search"
  | "tyre_view"
  | "whatsapp_click"
  | "call_click"
  | "lead_submitted"
  | "no_results";

function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let s = window.sessionStorage.getItem("gmtl_sid");
  if (!s) { s = crypto.randomUUID(); window.sessionStorage.setItem("gmtl_sid", s); }
  return s;
}

export async function track(event: AnalyticsEvent, payload: Record<string, any> = {}) {
  if (typeof window === "undefined") return;
  try {
    await supabase.from("analytics_events").insert({
      event_name: event,
      payload,
      session_id: sessionId(),
      page: window.location.pathname + window.location.search,
    });
  } catch {}
  // Future: forward to GA/Meta based on business_info settings.
}
