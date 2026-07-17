import { Phone, MessageCircle, MapPin } from "lucide-react";
import { business, telLink, waLink } from "@/lib/business";

export function MobileActionBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-surface shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)] md:hidden">
      <a href={telLink()} className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold text-ink">
        <Phone className="h-5 w-5 text-primary" /> Call
      </a>
      <a
        href={waLink("Assalam-o-Alaikum, I need help with tyres for my car.")}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center gap-1 border-x border-border bg-[#25D366] py-2.5 text-xs font-semibold text-white"
      >
        <MessageCircle className="h-5 w-5" /> WhatsApp
      </a>
      <a href={business.mapsUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold text-ink">
        <MapPin className="h-5 w-5 text-primary" /> Directions
      </a>
    </div>
  );
}
