import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, MapPin, Phone, MessageCircle } from "lucide-react";
import logo from "@/assets/logo.png";
import { business, telLink, waLink } from "@/lib/business";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 bg-ink text-white/80">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="h-11 w-11 rounded-full" width={44} height={44} />
            <span className="font-display text-lg text-white">
              Ghafoor <span className="text-primary">Motors</span>
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Genuine tyres, quality lubricants, and professional wheel care in Karachi.
          </p>
          <div className="mt-4 flex gap-3">
            <a href={business.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 hover:border-primary hover:text-primary">
              <Instagram className="h-4 w-4" />
            </a>
            <a href={business.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 hover:border-primary hover:text-primary">
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/tyres" className="hover:text-primary">Tyres</Link></li>
            <li><Link to="/lubricants" className="hover:text-primary">Lubricants</Link></li>
            <li><Link to="/services" className="hover:text-primary">Services</Link></li>
            <li><Link to="/tyre-guide" className="hover:text-primary">Tyre Guide</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Customer Support</h4>
          <ul className="space-y-2 text-sm">
            <li><a href={waLink("Assalam-o-Alaikum, I would like to request a quote.")} target="_blank" rel="noreferrer" className="hover:text-primary">Request a Quote</a></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
            <li><a href={business.mapsUrl} target="_blank" rel="noreferrer" className="hover:text-primary">Get Directions</a></li>
            <li><a href={telLink()} className="hover:text-primary">Call Us</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Visit</h4>
          <div className="space-y-3 text-sm">
            <p className="flex items-start gap-2 text-white/70">
              <MapPin className="mt-0.5 h-4 w-4 flex-none text-primary" />
              <span>{business.address.line1}, {business.address.line2}</span>
            </p>
            <p className="flex items-center gap-2 text-white/70">
              <Phone className="h-4 w-4 text-primary" />
              <a href={telLink()} className="hover:text-primary">{business.phoneDisplay}</a>
            </p>
            <p className="flex items-center gap-2 text-white/70">
              <MessageCircle className="h-4 w-4 text-primary" />
              <a href={waLink("Assalam-o-Alaikum, I have an inquiry.")} target="_blank" rel="noreferrer" className="hover:text-primary">WhatsApp</a>
            </p>
            <div className="pt-2 text-white/60">
              {business.hours.map((h) => (
                <div key={h.day} className="text-xs">{h.day}: <span className="text-white/80">{h.time}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x py-5 text-center text-xs text-white/50">
          © {year} Ghafoor Motors Tyres & Lubricants. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
