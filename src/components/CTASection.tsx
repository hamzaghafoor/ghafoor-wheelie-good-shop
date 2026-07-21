import { Phone, MessageCircle } from "lucide-react";
import { business, telLink, waLink } from "@/lib/business";
import { BookingButton } from "@/components/BookingButton";
import { track } from "@/lib/analytics";


export function CTASection() {
  return (
    <section className="bg-ink py-16 text-white md:py-20">
      <div className="container-x max-w-3xl text-center">
        <p className="eyebrow text-primary">Talk to a tyre expert</p>
        <h2 className="mt-3 font-display text-3xl md:text-5xl">Not sure which tyres fit your car?</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/70">
          Send your car make, model, year, or current tyre size — we'll suggest suitable options.
        </p>
        {/* Hidden on mobile — the fixed MobileActionBar already offers Call, WhatsApp and Book. */}
        <div className="mt-7 hidden flex-wrap justify-center gap-3 md:flex">
          <a href={waLink("Assalam-o-Alaikum, please help me choose suitable tyres. My car is:")} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { source: "cta_section" })} className="btn-primary">
            <MessageCircle className="h-4 w-4" /> WhatsApp Now
          </a>
          <BookingButton variant="light" context={{ source: "cta_section" }} />
          <a href={telLink()} className="btn-outline border-white/20 bg-transparent text-white hover:text-primary">
            <Phone className="h-4 w-4" /> Call {business.phoneDisplay}
          </a>
        </div>

        <p className="mt-4 text-xs text-white/50">No complicated forms. Just tell us what you drive.</p>
      </div>
    </section>
  );
}
