import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, MessageCircle, MapPin, Sparkles, Wrench, Star, Award, Users } from "lucide-react";
import { HeroTyreViewer } from "@/components/hero/HeroTyreViewer";
import catTyres from "@/assets/cat-tyres.jpg";
import catLubes from "@/assets/cat-lubricants.jpg";
import svcAlign from "@/assets/svc-alignment.jpg";
import svcBal from "@/assets/svc-balancing.jpg";
import { tyres, tyrePriorities } from "@/lib/tyres";
import { services } from "@/lib/services";
import { popularVehicles } from "@/lib/vehicles";
import { business, waLink } from "@/lib/business";
import { TyreFinder } from "@/components/TyreFinder";
import { ProductCard } from "@/components/ProductCard";
import { ServiceCard } from "@/components/ServiceCard";
import { LocationSection } from "@/components/LocationSection";
import { CTASection } from "@/components/CTASection";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ghafoor Motors Tyres & Lubricants | Tyres & Wheel Care Karachi" },
      { name: "description", content: "Genuine tyres, quality lubricants, wheel alignment, balancing and professional wheel-care services at Ghafoor Motors in PECHS, Karachi." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Hero />
      <div className="container-x -mt-12 relative z-10">
        <TyreFinder />
      </div>
      <TrustStrip />
      <ShopByNeed />
      <FeaturedTyres />
      <VehicleCategories />
      <ServicesPreview />
      <WhySection />
      <ReviewsSection />
      <EducationSection />
      <LocationSection />
      <CTASection />
    </>
  );
}

function Hero() {
  return (
    <section className="bg-ink pt-10 pb-24 text-white md:pt-16 md:pb-32">
      <div className="container-x grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow text-primary">Tyres • Lubricants • Wheel Care</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] md:text-6xl">
            The Right Tyres for a<br /><span className="text-primary">Safer, Smoother</span> Drive.
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/70 md:text-lg">
            Get genuine tyres, expert recommendations, quality lubricants, and professional wheel-care services at Ghafoor Motors Tyres & Lubricants in PECHS, Karachi.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/tyres" className="btn-primary text-sm md:text-base">
              Find Tyres for My Car <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={waLink("Assalam-o-Alaikum, please share today's price for tyres.")} target="_blank" rel="noreferrer" className="btn-outline border-white/20 bg-transparent text-white hover:text-primary">
              <MessageCircle className="h-4 w-4" /> WhatsApp for Today's Price
            </a>
          </div>
          <p className="mt-4 text-xs text-white/50">Expert guidance • Professional fitting • Convenient Karachi location</p>
        </div>
        <div className="relative mx-auto w-full max-w-[520px]">
          <HeroTyreViewer rotationSpeed={0.15} enableInteraction mobileFallback />
          <div className="absolute -bottom-6 -left-4 hidden max-w-xs rounded-xl border border-border bg-surface p-4 shadow-xl md:block">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Need help choosing?
            </div>
            <p className="mt-1 text-sm text-foreground">Tell us your car model and our team will recommend the right options.</p>
          </div>
        </div>
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
        <div className="mb-8 max-w-2xl">
          <p className="eyebrow">What we do</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">What Does Your Car Need Today?</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.title} to={c.to} className="card-surface group overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                <img src={c.img} alt={c.title} loading="lazy" width={800} height={600} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-4">
                <h3 className="font-display text-lg text-ink">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  {c.cta} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedTyres() {
  const [filter, setFilter] = useState<string>("All");
  const filtered = tyres.filter((t) => {
    if (filter === "All") return true;
    if (filter === "Passenger Cars") return t.category === "Passenger" || t.category === "Hatchback";
    if (filter === "SUVs") return t.category === "SUV";
    return t.priorities.includes(filter as any);
  });
  const chips = ["All", "Passenger Cars", "SUVs", ...tyrePriorities];
  return (
    <section className="py-16 md:py-20">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="eyebrow">Featured</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">Popular Tyre Options</h2>
            <p className="mt-2 text-muted-foreground">Explore options for everyday cars, sedans, SUVs, and crossovers.</p>
          </div>
          <Link to="/tyres" className="text-sm font-semibold text-primary hover:underline">View all tyres →</Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${filter === c ? "border-ink bg-ink text-white" : "border-border bg-surface text-foreground/70 hover:border-primary hover:text-primary"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.slice(0, 8).map((t) => <ProductCard key={t.id} tyre={t} />)}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Demo product data shown. Prices and availability confirmed via WhatsApp.</p>
      </div>
    </section>
  );
}

function VehicleCategories() {
  const cats = [
    { title: "Hatchbacks", body: "City-friendly options for compact cars." },
    { title: "Sedans", body: "Balanced comfort and control for daily driving." },
    { title: "SUVs & Crossovers", body: "Highway stability and rugged options." },
    { title: "Commercial Vehicles", body: "Load-ready tyres for work vehicles." },
  ];
  return (
    <section className="bg-ink py-16 text-white md:py-20">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary">By vehicle</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Tyres for the Cars Karachi Drives</h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cats.map((c) => (
            <Link key={c.title} to="/tyres" className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-primary/60 hover:bg-white/[0.06]">
              <h3 className="font-display text-xl text-white">{c.title}</h3>
              <p className="mt-1 text-sm text-white/60">{c.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">Browse <ArrowRight className="h-3.5 w-3.5" /></span>
            </Link>
          ))}
        </div>
        <div className="mt-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">Popular in Karachi</p>
          <div className="flex flex-wrap gap-2">
            {popularVehicles.map((v) => (
              <a
                key={v}
                href={waLink(`Assalam-o-Alaikum, please suggest suitable tyres for my ${v}. Kindly share options and today's price.`)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 transition hover:border-primary hover:text-primary"
              >
                {v}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ServicesPreview() {
  return (
    <section className="py-16 md:py-20">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow">Services</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Professional Care Beyond Tyres</h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 3).map((s) => <ServiceCard key={s.id} service={s} />)}
        </div>
        <div className="mt-6 text-center">
          <Link to="/services" className="btn-outline">See all services <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section className="bg-surface-2 py-16 md:py-24">
      <div className="container-x grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="overflow-hidden rounded-2xl border border-border">
          <img src={svcAlign} alt="Ghafoor Motors workshop" loading="lazy" width={1200} height={900} className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="eyebrow">Why Ghafoor Motors</p>
          <h2 className="mt-2 font-display text-3xl md:text-5xl">Straight Advice. Suitable Products. Professional Service.</h2>
          <p className="mt-4 text-foreground/80">
            Choosing tyres should not be confusing. Our team helps customers compare suitable options based on their vehicle, road use, comfort needs, and budget—without unnecessary complications.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-foreground/80">
            {[
              "Recommendations based on vehicle and usage",
              "Multiple suitable options where available",
              "Professional fitting and wheel-care support",
              "Clear guidance on tyre size and maintenance",
              "Convenient showroom in central Karachi",
            ].map((s) => (
              <li key={s} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary" />{s}</li>
            ))}
          </ul>
          <a href={waLink("Assalam-o-Alaikum, I would like to speak to a tyre expert.")} target="_blank" rel="noreferrer" className="btn-primary mt-6 text-sm">
            Speak to a Tyre Expert
          </a>
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
              <div className="flex items-center justify-center gap-2 md:justify-start">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Google Reviews</span>
              </div>
              <div className="mt-3 font-display text-5xl text-ink">{rating.toFixed(1)}</div>
              <div className="mt-1 flex justify-center gap-0.5 md:justify-start">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? "fill-primary text-primary" : "text-border"}`} />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{reviewCount ? `${reviewCount}+ verified reviews` : "Verified Google reviews"}</p>
            </div>
            <div>
              <h2 className="font-display text-3xl text-ink md:text-4xl">Trusted by Karachi Drivers</h2>
              <p className="mt-2 text-muted-foreground">Real customer reviews will be featured here once verified reviews are supplied.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={reviewsUrl} target="_blank" rel="noreferrer" className="btn-primary text-sm">
                  <Users className="h-4 w-4" /> Read Our Google Reviews
                </a>
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
          <div>
            <p className="eyebrow">Tyre Guide</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">Simple Tyre Advice for Safer Driving</h2>
          </div>
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
