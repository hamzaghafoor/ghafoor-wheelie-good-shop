import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Truck, Wrench, Sparkles } from "lucide-react";
import hero from "@/assets/hero.jpg";
import catTyres from "@/assets/cat-tyres.jpg";
import catLubes from "@/assets/cat-lubricants.jpg";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const featured = products.slice(0, 3);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={hero} alt="Tyres and motor oil in a workshop" className="h-full w-full object-cover opacity-40" width={1600} height={1000} />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
          <div className="absolute inset-0 grid-lines opacity-40" />
        </div>

        <div className="container-x relative grid min-h-[78vh] items-center gap-10 py-20 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Est. 1998 · Lahore
            </div>
            <h1 className="mt-5 font-display text-6xl leading-[0.95] tracking-wide sm:text-7xl lg:text-8xl">
              Built for<br />the road<br /><span className="text-primary">ahead.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Premium tyres and engine oils from the brands you trust — hand-picked by the Ghafoor Motors team and delivered across Pakistan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-display text-lg tracking-wide text-primary-foreground shadow-glow transition hover:brightness-110"
              >
                Shop now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/products"
                search={{ cat: "Lubricants" }}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-6 py-3 font-display text-lg tracking-wide transition hover:border-primary hover:text-primary"
              >
                Browse Lubricants
              </Link>
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                { k: "27+", v: "Years" },
                { k: "60+", v: "Brands" },
                { k: "24h", v: "Delivery" },
              ].map((s) => (
                <div key={s.v} className="border-l-2 border-primary pl-3">
                  <div className="font-display text-3xl text-foreground">{s.k}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-x py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Categories</div>
            <h2 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">Shop by category</h2>
          </div>
          <Link to="/products" className="hidden text-sm font-medium text-muted-foreground hover:text-primary sm:inline">All products →</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { title: "Tyres", desc: "Performance, SUV, touring & commercial.", img: catTyres, cat: "Tyres" as const },
            { title: "Lubricants", desc: "Engine oils, brake fluids and additives.", img: catLubes, cat: "Lubricants" as const },
          ].map((c) => (
            <Link
              key={c.title}
              to="/products"
              search={{ cat: c.cat }}
              className="group relative flex h-72 items-end overflow-hidden rounded-2xl border border-border/60 bg-surface"
            >
              <img src={c.img} alt={c.title} className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-500 group-hover:scale-105 group-hover:opacity-80" loading="lazy" width={900} height={900} />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="relative z-10 p-8">
                <h3 className="font-display text-5xl tracking-wide">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="container-x py-10">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Bestsellers</div>
            <h2 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">Featured products</h2>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* FEATURES */}
      <section className="container-x py-20">
        <div className="grid gap-4 rounded-2xl border border-border/60 bg-surface p-2 md:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "Genuine only", d: "Every product is sourced through authorised distributors." },
            { icon: Truck, t: "Fast delivery", d: "Same-day dispatch in Lahore. 24–72h nationwide." },
            { icon: Wrench, t: "Expert fitting", d: "Free wheel balancing with every set of four tyres." },
          ].map((f) => (
            <div key={f.t} className="flex items-start gap-4 rounded-xl p-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-xl tracking-wide">{f.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-x pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface p-10 md:p-16">
          <div className="absolute inset-0 diag-stripes opacity-30" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-4xl tracking-wide md:text-5xl">Not sure what fits your car?</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">Send us your car make, model and year — we'll recommend the right tyre size and oil grade within an hour.</p>
            </div>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-display text-lg tracking-wide text-primary-foreground hover:brightness-110">
              Ask an expert <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
