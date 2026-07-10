import { Link } from "@tanstack/react-router";
import { Phone, MapPin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-surface">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-display text-2xl tracking-wide">
            GHAFOOR<span className="text-primary"> MOTORS</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Trusted supplier of premium tyres and lubricants for cars, SUVs and commercial fleets since 1998.
          </p>
        </div>

        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Shop</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/products" className="hover:text-primary">All products</Link></li>
            <li><Link to="/products" search={{ cat: "Tyres" }} className="hover:text-primary">Tyres</Link></li>
            <li><Link to="/products" search={{ cat: "Lubricants" }} className="hover:text-primary">Lubricants</Link></li>
          </ul>
        </div>

        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Visit us</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" /> Main GT Road, Lahore</li>
            <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-primary" /> +92 300 1234567</li>
            <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 text-primary" /> sales@ghafoormotors.pk</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ghafoor Motors. All rights reserved.
      </div>
    </footer>
  );
}
