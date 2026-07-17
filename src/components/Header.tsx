import { Link } from "@tanstack/react-router";
import { Phone, Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";
import { business, telLink, waLink } from "@/lib/business";

const nav: { to: string; label: string; exact?: boolean }[] = [
  { to: "/", label: "Home", exact: true },
  { to: "/tyres", label: "Tyres" },
  { to: "/lubricants", label: "Lubricants" },
  { to: "/services", label: "Services" },
  { to: "/tyre-guide", label: "Tyre Guide" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Utility bar */}
      <div className="hidden bg-ink text-white/85 md:block">
        <div className="container-x flex h-9 items-center justify-between text-xs">
          <span>Visit us at Khalid Bin Waleed Road, PECHS, Karachi</span>
          <div className="flex items-center gap-4">
            <a href={telLink()} className="hover:text-primary">Call: {business.phoneDisplay}</a>
            <a href={waLink("Assalam-o-Alaikum, I found Ghafoor Motors through your website.")} target="_blank" rel="noreferrer" className="hover:text-primary">WhatsApp</a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-4 md:h-20">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Ghafoor Motors home">
            <img src={logo} alt="Ghafoor Motors Tyres & Lubricants" className="h-11 w-11 rounded-full object-contain md:h-12 md:w-12" width={48} height={48} />
            <span className="hidden font-display text-lg leading-none tracking-tight text-ink sm:block">
              Ghafoor <span className="text-primary">Motors</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="text-sm font-medium text-foreground/70 transition hover:text-ink"
                activeProps={{ className: "text-ink" }}
                activeOptions={{ exact: n.exact }}
              >
                {n.label}
                {n.label === "Tyres" && <ChevronDown className="ml-0.5 inline h-3.5 w-3.5" />}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href={telLink()} className="hidden items-center gap-2 text-sm font-semibold text-ink hover:text-primary md:inline-flex">
              <Phone className="h-4 w-4" /> Call Us
            </a>
            <a
              href={waLink("Assalam-o-Alaikum, please share today's price for tyres suitable for my car.")}
              target="_blank"
              rel="noreferrer"
              className="btn-primary hidden text-sm md:inline-flex"
            >
              Get Today's Price
            </a>
            <button
              className="grid h-10 w-10 place-items-center rounded-md border border-border lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border bg-surface lg:hidden">
            <div className="container-x flex flex-col py-2">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="border-b border-border/60 py-3 text-sm font-medium text-foreground/80"
                  activeProps={{ className: "text-primary" }}
                  activeOptions={{ exact: n.exact }}
                >
                  {n.label}
                </Link>
              ))}
              <div className="flex gap-2 py-3">
                <a href={telLink()} className="btn-outline flex-1 text-sm">Call</a>
                <a href={waLink("Assalam-o-Alaikum, I need help with tyres for my car.")} target="_blank" rel="noreferrer" className="btn-primary flex-1 text-sm">WhatsApp</a>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
