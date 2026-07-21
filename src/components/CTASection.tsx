import { Phone, MessageCircle } from "lucide-react";
import { business, telLink, waLink } from "@/lib/business";

export function CTASection() {
  return (
    <section className="bg-ink py-16 text-white md:py-20">
      <div className="container-x max-w-3xl text-center">
        <p className="eyebrow text-primary">Not sure what fits your car?</p>
        <h2 className="mt-3 font-display text-3xl md:text-5xl">Not Sure Which Tyres Fit Your Car?</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/70">
          Send us your car make, model, year, or current tyre size. Our team will help you compare suitable options.
        </p>
        {/* Hidden on mobile — the fixed MobileActionBar already offers Call and WhatsApp. */}
        <div className="mt-7 hidden flex-wrap justify-center gap-3 md:flex">
          <a href={waLink("Assalam-o-Alaikum, please help me choose suitable tyres. My car is:")} target="_blank" rel="noreferrer" className="btn-primary">
            <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
          </a>
          <a href={telLink()} className="btn-outline border-white/20 bg-transparent text-white hover:text-primary">
            <Phone className="h-4 w-4" /> Call {business.phoneDisplay}
          </a>
        </div>
        <p className="mt-4 text-xs text-white/50">No complicated forms. Just tell us what you drive.</p>
      </div>
    </section>
  );
}
