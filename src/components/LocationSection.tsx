import { MapPin, Phone, MessageCircle, Clock } from "lucide-react";
import { business, telLink, waLink } from "@/lib/business";

export function LocationSection() {
  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    "Ghafoor Motors Tyres Lubricants, Khalid Bin Waleed Road, PECHS, Karachi"
  )}&output=embed`;

  return (
    <section className="py-16 md:py-20">
      <div className="container-x grid gap-8 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Location</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Visit Ghafoor Motors in PECHS</h2>
          <div className="mt-6 space-y-3 text-foreground/80">
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 flex-none text-primary" />
              <span>
                {business.name}<br />
                {business.address.line1}<br />
                {business.address.line2}
              </span>
            </p>
            <p className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary" />
              <a href={telLink()} className="hover:text-primary">{business.phoneDisplay}</a>
            </p>
            <p className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 flex-none text-primary" />
              <span>
                {business.hours.map((h) => (
                  <span key={h.day} className="block text-sm">
                    <span className="font-semibold text-ink">{h.day}:</span> {h.time}
                  </span>
                ))}
              </span>
            </p>
          </div>
          {/* Hidden on mobile — the fixed MobileActionBar already offers Call / WhatsApp / Directions. */}
          <div className="mt-6 hidden flex-wrap gap-3 md:flex">
            <a href={business.mapsUrl} target="_blank" rel="noreferrer" className="btn-primary text-sm">
              <MapPin className="h-4 w-4" /> Get Directions
            </a>
            <a href={telLink()} className="btn-dark text-sm">
              <Phone className="h-4 w-4" /> Call Now
            </a>
            <a href={waLink("Assalam-o-Alaikum, I would like to visit your showroom.")} target="_blank" rel="noreferrer" className="btn-outline text-sm">
              <MessageCircle className="h-4 w-4" /> WhatsApp Us
            </a>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)]">
          <iframe
            title="Ghafoor Motors location map"
            src={embedSrc}
            className="h-[380px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}
