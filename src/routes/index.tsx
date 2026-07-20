import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ShieldCheck, MessageCircle, MapPin, Sparkles, Wrench, Star, Award, Users } from "lucide-react";
import { HeroTyreViewer } from "@/components/hero/HeroTyreViewer";
import catTyres from "@/assets/cat-tyres.jpg";
import catLubes from "@/assets/cat-lubricants.jpg";
import svcAlign from "@/assets/svc-alignment.jpg";
import svcBal from "@/assets/svc-balancing.jpg";
import { services } from "@/lib/services";
import { business, waLink } from "@/lib/business";
import { TyreFinderShared } from "@/components/finder/TyreFinderShared";
import { ServiceCard } from "@/components/ServiceCard";
import { LocationSection } from "@/components/LocationSection";
import { CTASection } from "@/components/CTASection";
import { listPublishedHomepageSections } from "@/lib/sections.functions";
import { listBrandsPublic } from "@/lib/brands.functions";
import { listPublishedCatalogue } from "@/lib/catalogue.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ghafoor Motors Tyres & Lubricants | Tyres & Wheel Care Karachi" },
      { name: "description", content: "Genuine tyres, quality lubricants, wheel alignment, balancing and professional wheel-care services at Ghafoor Motors in PECHS, Karachi." },
    ],
  }),
  component: HomePage,
});

const RENDER_ORDER = [
  "hero", "tyre_finder", "trust_strip", "vehicle_categories", "featured_brands",
  "featured_tyres", "services_grid", "why_us", "reviews", "articles", "location", "contact_cta",
];

function HomePage() {
  const fetchSections = useServerFn(listPublishedHomepageSections);
  const { data: sections } = useQuery({ queryKey: ["public-sections"], queryFn: () => fetchSections() });

  const byType = new Map<string, any>();
  for (const s of sections ?? []) byType.set(s.type, s);
  // If DB has no sections yet, show everything (legacy default).
  const enabled = (t: string) => sections === undefined || sections.length === 0 || byType.has(t);
  const cfg = (t: string) => byType.get(t)?.config ?? {};

  return (
    <>
      {enabled("hero") && <Hero c={cfg("hero")} />}
      {enabled("tyre_finder") && (
        <div className="container-x -mt-12 relative z-10"><TyreFinderShared variant="hero" /></div>
      )}
      {enabled("trust_strip") && <TrustStrip />}
      {enabled("vehicle_categories") && <ShopByNeed />}
      {enabled("featured_brands") && <FeaturedBrandsSection c={cfg("featured_brands")} />}
      {enabled("featured_tyres") && <FeaturedTyres c={cfg("featured_tyres")} />}
      {enabled("services_grid") && <ServicesPreview />}
      {enabled("why_us") && <WhySection />}
      {enabled("reviews") && <ReviewsSection />}
      {enabled("articles") && <EducationSection />}
      {enabled("location") && <LocationSection />}
      {enabled("contact_cta") && <CTASection />}
    </>
  );
}

function Hero({ c }: { c: any }) {
  const ease = [0.22, 1, 0.36, 1] as const;
  const eyebrow = c.eyebrow || "Tyres • Lubricants • Wheel Care";
  const line1 = c.heading_line1 || "The Right Tyres for a";
  const line2 = c.heading_line2 || "Safer, Smoother Drive.";
  const description = c.description || "Get genuine tyres, expert recommendations, quality lubricants, and professional wheel-care services at Ghafoor Motors Tyres & Lubricants in PECHS, Karachi.";
  const primaryLabel = c.primary_cta_label || "Find Tyres for My Car";
  const primaryHref = c.primary_cta_href || "/tyres";
  const secondaryLabel = c.secondary_cta_label || "WhatsApp for Today's Price";
  const secondaryWa = c.secondary_cta_wa || "Assalam-o-Alaikum, please share today's price for tyres.";
  const trustLine = c.trust_line || "Expert guidance • Professional fitting • Convenient Karachi location";
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: "radial-gradient(60% 60% at 75% 45%, rgba(244,122,32,0.18), transparent 70%), radial-gradient(50% 60% at 20% 30%, rgba(255,255,255,0.05), transparent 70%)" }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="container-x relative grid items-center gap-10 lg:grid-cols-[52fr_48fr]" style={{ minHeight: "calc(100vh - 80px)", paddingTop: "clamp(32px, 6vw, 72px)", paddingBottom: "clamp(32px, 6vw, 72px)" }}>
        <div>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="eyebrow text-primary">{eyebrow}</motion.p>
          <h1 className="mt-4 font-display text-white" style={{ fontSize: "clamp(40px, 4.7vw, 76px)", lineHeight: 1.02, maxWidth: "850px" }}>
            <motion.span className="block overflow-hidden">
              <motion.span className="block" initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: 0.6, delay: 0.15, ease }}>{line1}</motion.span>
            </motion.span>
            <motion.span className="block overflow-hidden">
              <motion.span className="block" initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: 0.6, delay: 0.28, ease }}>
                <span className="text-primary">{line2}</span>
              </motion.span>
            </motion.span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5, ease }} className="mt-5 max-w-[560px] text-base text-white/70 md:text-lg">{description}</motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.65, ease }} className="mt-6 flex flex-wrap gap-3">
            <Link to={primaryHref} className="btn-primary text-sm md:text-base">{primaryLabel} <ArrowRight className="h-4 w-4" /></Link>
            <a href={waLink(secondaryWa)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:border-primary hover:text-primary md:text-base">
              <MessageCircle className="h-4 w-4" /> {secondaryLabel}
            </a>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.85 }} className="mt-4 text-xs text-white/55">{trustLine}</motion.p>
        </div>
        <div className="order-last lg:order-none"><HeroTyreViewer /></div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    { icon: ShieldCheck, title: "Genuine Product Focus", body: "Quality products from reputable tyre and lubricant brands." },
    { icon: Sparkles, title: "Expert Recommendations", body: "Advice based on your car, driving needs, and budget." },
    { icon: Wrench, title: "Professional Wheel Care", body: "Alignment, balancing, and tyre-care services." },
    { icon: MapPin, title: "Convenient Karachi Location", body: "Located on Khalid Bin Waleed Road, PECHS." },
  ];
  return (
    <section className="py-16">
      <div className="container-x grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.title} className="card-surface p-5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><i.icon className="h-5 w-5" /></div>
            <h3 className="mt-3 font-display text-lg text-ink">{i.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{i.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShopByNeed() {
  const cards = [
    { title: "New Tyres", body: "Find suitable tyre options for your car, SUV, or crossover.", cta: "Explore Tyres", to: "/tyres", img: catTyres },
    { title: "Wheel Alignment", body: "Improve steering control and reduce uneven tyre wear.", cta: "Book Alignment", to: "/services", img: svcAlign },
    { title: "Wheel Balancing", body: "Reduce steering vibration and improve ride comfort.", cta: "Book Balancing", to: "/services", img: svcBal },
    { title: "Engine Oil & Lubricants", body: "Find quality lubricants suitable for your vehicle.", cta: "Explore Lubricants", to: "/lubricants", img: catLubes },
  ] as const;
  return (
    <section className="bg-surface-2 py-16 md:py-20">
      <div className="container-x">
        <div className="mb-8 max-w-2xl"><p className="eyebrow">What we do</p><h2 className="mt-2 font-display text-3xl md:text-4xl">What Does Your Car Need Today?</h2></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.title} to={c.to} className="card-surface group overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                <img src={c.img} alt={c.title} loading="lazy" width={800} height={600} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-4">
                <h3 className="font-display text-lg text-ink">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">{c.cta} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedBrandsSection({ c }: { c: any }) {
  const fetchBrands = useServerFn(listBrandsPublic);
  const { data: allBrands } = useQuery({ queryKey: ["public-brands"], queryFn: () => fetchBrands() });
  const heading = c.heading || "Trusted Brands We Stock";
  const subtitle = c.subtitle || "";
  const mode = c.mode ?? "featured";
  const max = c.max ?? 8;
  const brands = (allBrands ?? []).filter((b: any) => mode === "manual" ? (c.brand_ids ?? []).includes(b.id) : b.is_featured).slice(0, max);
  if (brands.length === 0) return null;
  return (
    <section className="py-14">
      <div className="container-x">
        <div className="mb-6 max-w-2xl"><p className="eyebrow">Brands</p><h2 className="mt-2 font-display text-3xl md:text-4xl">{heading}</h2>{subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}</div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {brands.map((b: any) => (
            <div key={b.id} className="card-surface flex aspect-square items-center justify-center p-3">
              {b.logo_url ? <img src={b.logo_url} alt={b.name} className="max-h-full max-w-full object-contain" loading="lazy" /> : <span className="text-center text-xs font-semibold text-ink">{b.name}</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedTyres({ c }: { c: any }) {
  const heading = c.heading || "Popular Tyre Options";
  const subtitle = c.subtitle || "Explore live inventory or ask our team for a personalised recommendation.";
  const ctaLabel = c.cta_label || "View tyre catalogue";
  const max = c.max ?? 6;
  const mode = c.mode ?? "featured";
  const fetchCat = useServerFn(listPublishedCatalogue);
  const { data } = useQuery({ queryKey: ["public-catalogue"], queryFn: () => fetchCat() });
  const allModels: any[] = (data as any[]) ?? [];
  const models = allModels.filter((m) => mode === "manual" ? (c.model_ids ?? []).includes(m.id) : m.is_featured);
  const withStock = c.in_stock_only ? models.filter((m) => (m.variants ?? []).some((v: any) => v.availability === "in_stock")) : models;
  const list = withStock.slice(0, max);

  return (
    <section className="py-16 md:py-20">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl"><p className="eyebrow">Featured</p><h2 className="mt-2 font-display text-3xl md:text-4xl">{heading}</h2><p className="mt-2 text-muted-foreground">{subtitle}</p></div>
          <Link to="/tyres" className="text-sm font-semibold text-primary hover:underline">{ctaLabel} →</Link>
        </div>
        {list.length === 0 ? (
          <div className="card-surface mt-8 p-10 text-center">
            <h3 className="font-display text-2xl text-ink">Our online catalogue is being updated.</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Share your vehicle and tyre size with us on WhatsApp — we'll suggest suitable options and today's price.</p>
            <div className="mt-4"><Link to="/tyres" className="btn-primary text-sm">Browse tyres</Link></div>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m: any) => {
              const vs: any[] = m.variants ?? [];
              const priced = vs.find((v) => v.price != null);
              const img = m.images?.main?.url || null;
              return (
                <Link key={m.id} to="/tyres" className="card-surface group overflow-hidden">
                  <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                    {img ? <img src={img} alt={m.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>}
                  </div>
                  <div className="p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">{m.brand?.name ?? ""}</div>
                    <h3 className="mt-1 font-display text-lg text-ink">{m.name}</h3>
                    {m.short_desc && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{m.short_desc}</p>}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{vs.length} size{vs.length === 1 ? "" : "s"}</span>
                      {priced && <span className="font-semibold text-ink">from PKR {Number(priced.price).toLocaleString()}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ServicesPreview() {
  return (
    <section className="py-16 md:py-20">
      <div className="container-x">
        <div className="max-w-2xl"><p className="eyebrow">Services</p><h2 className="mt-2 font-display text-3xl md:text-4xl">Professional Care Beyond Tyres</h2></div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{services.slice(0, 3).map((s) => <ServiceCard key={s.id} service={s} />)}</div>
        <div className="mt-6 text-center"><Link to="/services" className="btn-outline">See all services <ArrowRight className="h-4 w-4" /></Link></div>
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section className="bg-surface-2 py-16 md:py-24">
      <div className="container-x grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="overflow-hidden rounded-2xl border border-border"><img src={svcAlign} alt="Ghafoor Motors workshop" loading="lazy" width={1200} height={900} className="h-full w-full object-cover" /></div>
        <div>
          <p className="eyebrow">Why Ghafoor Motors</p>
          <h2 className="mt-2 font-display text-3xl md:text-5xl">Straight Advice. Suitable Products. Professional Service.</h2>
          <p className="mt-4 text-foreground/80">Choosing tyres should not be confusing. Our team helps customers compare suitable options based on their vehicle, road use, comfort needs, and budget—without unnecessary complications.</p>
          <ul className="mt-5 space-y-2 text-sm text-foreground/80">
            {["Recommendations based on vehicle and usage","Multiple suitable options where available","Professional fitting and wheel-care support","Clear guidance on tyre size and maintenance","Convenient showroom in central Karachi"].map((s) => (
              <li key={s} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary" />{s}</li>
            ))}
          </ul>
          <a href={waLink("Assalam-o-Alaikum, I would like to speak to a tyre expert.")} target="_blank" rel="noreferrer" className="btn-primary mt-6 text-sm">Speak to a Tyre Expert</a>
        </div>
      </div>
    </section>
  );
}

function ReviewsSection() {
  const { rating, reviewCount, reviewsUrl } = business.google;
  return (
    <section className="py-16 md:py-20">
      <div className="container-x">
        <div className="card-surface p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_2fr] md:items-center">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center gap-2 md:justify-start"><Award className="h-5 w-5 text-primary" /><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Google Reviews</span></div>
              <div className="mt-3 font-display text-5xl text-ink">{rating.toFixed(1)}</div>
              <div className="mt-1 flex justify-center gap-0.5 md:justify-start">{Array.from({ length: 5 }).map((_, i) => (<Star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? "fill-primary text-primary" : "text-border"}`} />))}</div>
              <p className="mt-1 text-xs text-muted-foreground">{reviewCount ? `${reviewCount}+ verified reviews` : "Verified Google reviews"}</p>
            </div>
            <div>
              <h2 className="font-display text-3xl text-ink md:text-4xl">Trusted by Karachi Drivers</h2>
              <p className="mt-2 text-muted-foreground">Real customer reviews will be featured here once verified reviews are supplied.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={reviewsUrl} target="_blank" rel="noreferrer" className="btn-primary text-sm"><Users className="h-4 w-4" /> Read Our Google Reviews</a>
                <a href={reviewsUrl} target="_blank" rel="noreferrer" className="btn-outline text-sm">Leave a Review</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EducationSection() {
  const posts = [
    { title: "How to Read Your Tyre Size", body: "195/65 R15 explained in simple terms." },
    { title: "When Should You Replace Your Tyres?", body: "Tread depth, age and damage — what to check." },
    { title: "Wheel Alignment vs Wheel Balancing", body: "Two different services, two different problems." },
  ];
  return (
    <section className="bg-surface-2 py-16 md:py-20">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">Tyre Guide</p><h2 className="mt-2 font-display text-3xl md:text-4xl">Simple Tyre Advice for Safer Driving</h2></div>
          <Link to="/tyre-guide" className="text-sm font-semibold text-primary hover:underline">View all guides →</Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.title} to="/tyre-guide" className="card-surface p-6 transition hover:border-primary/50">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Guide</div>
              <h3 className="mt-2 font-display text-xl text-ink">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Read more <ArrowRight className="h-3.5 w-3.5" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
