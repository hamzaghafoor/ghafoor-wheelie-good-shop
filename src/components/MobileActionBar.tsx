import { Phone, MessageCircle, MapPin, Calendar } from "lucide-react";
import { business, telLink, waLink } from "@/lib/business";
import { openBookingPopup, resolveCalendlyUrl, useBookingSettings } from "@/lib/booking";
import { track } from "@/lib/analytics";

export function MobileActionBar() {
  const settings = useBookingSettings();
  const bookingUrl = resolveCalendlyUrl(settings);
  const cols = bookingUrl ? 4 : 3;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-surface shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)] md:hidden"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      <a href={telLink()} onClick={() => track("call_click", { source: "mobile_bar" })} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-ink">
        <Phone className="h-5 w-5 text-primary" /> Call
      </a>
      <a
        href={waLink("Assalam-o-Alaikum, I need help with tyres for my car.")}
        target="_blank"
        rel="noreferrer"
        onClick={() => track("whatsapp_click", { source: "mobile_bar" })}
        className="flex flex-col items-center gap-1 border-x border-border bg-[#25D366] py-2.5 text-[11px] font-semibold text-white"
      >
        <MessageCircle className="h-5 w-5" /> WhatsApp
      </a>
      {bookingUrl && (
        <button
          type="button"
          onClick={() => openBookingPopup(bookingUrl, { medium: "mobile_bar" })}
          className="flex flex-col items-center gap-1 border-r border-border bg-primary py-2.5 text-[11px] font-semibold text-white"
        >
          <Calendar className="h-5 w-5" /> Book
        </button>
      )}
      <a href={business.mapsUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-ink">
        <MapPin className="h-5 w-5 text-primary" /> Directions
      </a>
    </div>
  );
}
