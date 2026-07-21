import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, MessageCircle, MapPin, WifiOff } from "lucide-react";
import { business, telLink, waLink } from "@/lib/business";

export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [
      { title: "Offline | Ghafoor Motors Tyres & Lubricants" },
      { name: "description", content: "You're offline. Contact Ghafoor Motors by phone, WhatsApp or visit our Karachi workshop." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OfflinePage,
});

function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4">
        <WifiOff className="h-8 w-8 text-primary" />
      </div>
      <h1 className="font-display text-3xl text-ink">You're offline</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No internet right now — but you can still reach us. Live prices, availability and account actions need connection.
      </p>

      <div className="mt-6 w-full space-y-2">
        <a
          href={telLink()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Phone className="h-4 w-4" /> Call {business.phoneDisplay}
        </a>
        <a
          href={waLink("Assalam-o-Alaikum, I need help.")}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
        <a
          href={business.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
        >
          <MapPin className="h-4 w-4" /> Directions to workshop
        </a>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-4 text-left text-sm">
        <div className="font-semibold text-ink">{business.name}</div>
        <div className="mt-1 text-muted-foreground">{business.address.line1}</div>
        <div className="text-muted-foreground">{business.address.line2}</div>
        <div className="mt-2 text-xs text-muted-foreground">Mon–Sat 10:00 AM – 9:00 PM • Sun by appointment</div>
      </div>

      <Link to="/" className="mt-6 text-xs font-semibold text-primary hover:underline">
        Try loading the home page again
      </Link>
    </div>
  );
}
