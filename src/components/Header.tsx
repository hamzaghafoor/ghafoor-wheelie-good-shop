import { Link } from "@tanstack/react-router";
import { Phone, Menu, X, Search, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import { business, telLink, waLink } from "@/lib/business";
import { BookingButton } from "@/components/BookingButton";
import { track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";


const nav: { to: string; label: string; exact?: boolean }[] = [
  { to: "/", label: "Home", exact: true },
  { to: "/tyres", label: "Tyres" },
  { to: "/lubricants", label: "Lubricants" },
  { to: "/filters", label: "Filters" },
  { to: "/accessories", label: "Accessories" },
  { to: "/services", label: "Services" },
  { to: "/contact", label: "Contact" },
];

const moreNav = [
  { to: "/maintenance-parts", label: "Maintenance Parts" },
  { to: "/car-care", label: "Car Care" },
  { to: "/additives", label: "Additives" },
  { to: "/tyre-guide", label: "Tyre Guide" },
  { to: "/about", label: "About" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const adminHref = signedIn ? "/admin" : "/auth";
  const adminSearch = signedIn ? undefined : { redirect: "/admin" };
  const adminDesktopLabel = signedIn ? "Admin Dashboard" : "Admin";
  const adminMobileLabel = signedIn ? "Admin Dashboard" : "Admin Login";

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

      <header className={`sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur transition-shadow duration-300 ${scrolled ? "header-scrolled" : ""}`}>
        <div className="container-x flex h-16 items-center justify-between gap-4 md:h-20">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Ghafoor Motors home">
            <img src={logo} alt="Ghafoor Motors Tyres & Lubricants" className="h-11 w-11 rounded-full object-contain md:h-12 md:w-12" width={48} height={48} />
            <span className="hidden font-display text-lg leading-none tracking-tight text-ink sm:block">
              Ghafoor <span className="text-primary">Motors</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-5 lg:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="text-sm font-medium text-foreground/70 transition hover:text-ink"
                activeProps={{ className: "text-ink" }}
                activeOptions={{ exact: n.exact }}
              >
                {n.label}
              </Link>
            ))}
            <div className="group relative">
              <button className="text-sm font-medium text-foreground/70 hover:text-ink">More</button>
              <div className="absolute right-0 top-full hidden min-w-[200px] rounded-lg border border-border bg-white p-1 shadow-lg group-hover:block">
                {moreNav.map((n) => (
                  <Link key={n.to} to={n.to} className="block rounded px-3 py-2 text-sm text-foreground/70 hover:bg-muted hover:text-ink">{n.label}</Link>
                ))}
                <div className="my-1 border-t border-border" />
                <Link to={adminHref as any} search={adminSearch as any} className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-primary">
                  <Shield className="h-3.5 w-3.5" /> {adminDesktopLabel}
                </Link>
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/search" className="hidden h-10 w-10 place-items-center rounded-md border border-border text-foreground/70 hover:text-ink md:grid" aria-label="Search"><Search className="h-4 w-4" /></Link>
            <a href={telLink()} className="hidden items-center gap-2 text-sm font-semibold text-ink hover:text-primary md:inline-flex">
              <Phone className="h-4 w-4" /> Call Us
            </a>
            <a
              href={waLink("Assalam-o-Alaikum, please share today's price for tyres suitable for my car.")}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("whatsapp_click", { source: "header" })}
              className="btn-primary hidden text-sm md:inline-flex"
            >
              WhatsApp Now
            </a>
            <BookingButton className="hidden md:inline-flex" context={{ source: "header" }} />

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
              {[...nav, ...moreNav].map((n: any) => (
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
              <Link to="/search" onClick={() => setOpen(false)} className="py-3 text-sm font-medium text-foreground/80">Search</Link>
              <Link
                to={adminHref as any}
                search={adminSearch as any}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-3 text-sm font-semibold text-primary"
              >
                <Shield className="h-4 w-4" /> {adminMobileLabel}
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
