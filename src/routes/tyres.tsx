import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Phone } from "lucide-react";
import { TyreFinder } from "@/components/TyreFinder";
import { CTASection } from "@/components/CTASection";
import { listPublishedCatalogue } from "@/lib/catalogue.functions";
import { business, telLink, waLink } from "@/lib/business";

export const Route = createFileRoute("/tyres")({
  head: () => ({
    meta: [
      { title: "Car Tyres in Karachi | Passenger, SUV & Hatchback Tyres | Ghafoor Motors" },
      { name: "description", content: "Browse tyre options for sedans, hatchbacks and SUVs. Get today's price and confirm availability via WhatsApp — Ghafoor Motors, PECHS, Karachi." },
    ],
  }),
  component: TyresPage,
});

type Variant = {
  id: string; normalized_size: string;
  price_mode: string; price: number | null; previous_price: number | null; price_note: string | null;
  availability: string; load_index: string | null; speed_rating: string | null;
  tubeless: boolean; run_flat: boolean; xl_reinforced: boolean; public_notes: string | null;
};
type Model = {
  id: string; name: string; short_desc: string | null;
  vehicle_categories: string[]; driving_characteristics: string[];
  images: Record<string, { url: string | null }>;
  brand: { id: string; name: string; logo_url: string | null };
  variants: Variant[];
};

function TyresPage() {
  const fetch = useServerFn(listPublishedCatalogue);
  const { data, isLoading } = useQuery<Model[]>({ queryKey: ["public-catalogue"], queryFn: () => fetch() as any });

  const [cat, setCat] = useState("All");
  const [brand, setBrand] = useState("All");
  const [availOnly, setAvailOnly] = useState(false);

  const all = data ?? [];
  const brands = useMemo(() => Array.from(new Set(all.map((m) => m.brand.name))), [all]);
  const categories = useMemo(() => Array.from(new Set(all.flatMap((m) => m.vehicle_categories))), [all]);
  const filtered = useMemo(() => all.filter((m) =>
    (cat === "All" || m.vehicle_categories.includes(cat)) &&
    (brand === "All" || m.brand.name === brand) &&
    (!availOnly || m.variants.some((v) => v.availability === "in_stock"))
  ), [all, cat, brand, availOnly]);

  return (
    <>
      <section className="bg-ink py-14 text-white md:py-20">
        <div className="container-x">
          <p className="eyebrow text-primary">Tyres</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Find Tyres for Your Vehicle</h1>
          <p className="mt-3 max-w-2xl text-white/70">Search by vehicle or size, compare options, and confirm today's price via WhatsApp.</p>
        </div>
      </section>

      <div className="container-x -mt-10 relative z-10">
        <TyreFinder compact />
      </div>

      <section className="py-14">
        <div className="container-x">
          {isLoading ? <div className="card-surface p-10 text-center text-sm text-muted-foreground">Loading tyre catalogue…</div> :
           all.length === 0 ? <EmptyCatalogue /> : (
            <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
              <aside className="card-surface h-fit p-5">
                <h3 className="font-display text-lg text-ink">Filters</h3>
                <FilterGroup label="Vehicle category">
                  <Chips options={["All", ...categories]} value={cat} onChange={setCat} />
                </FilterGroup>
                <FilterGroup label="Brand">
                  <select value={brand} onChange={(e) => setBrand(e.target.value)} className="h-10 w-full rounded-md border border-border bg-surface px-2 text-sm">
                    {["All", ...brands].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </FilterGroup>
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={availOnly} onChange={(e) => setAvailOnly(e.target.checked)} className="accent-primary" />
                  In stock only
                </label>
              </aside>

              <div>
                <p className="mb-4 text-sm text-muted-foreground">{filtered.length} model{filtered.length === 1 ? "" : "s"}</p>
                {filtered.length === 0 ? (
                  <div className="card-surface p-10 text-center">
                    <h3 className="font-display text-2xl text-ink">No matching tyres.</h3>
                    <p className="mt-2 text-muted-foreground">Contact us with your vehicle or size — we'll suggest alternatives.</p>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((m) => <ModelCard key={m.id} m={m} />)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
      <CTASection />
    </>
  );
}

function EmptyCatalogue() {
  return (
    <div className="card-surface p-10 text-center">
      <h2 className="font-display text-2xl md:text-3xl text-ink">Our online catalogue is being updated.</h2>
      <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
        We stock a wide range of tyres for sedans, hatchbacks, SUVs and commercial vehicles.
        Share your vehicle and size on WhatsApp — we'll suggest options and today's price.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <a href={waLink("Assalam-o-Alaikum, please suggest suitable tyres for my vehicle.")} target="_blank" rel="noreferrer" className="btn-primary text-sm">
          <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
        </a>
        <a href={telLink()} className="btn-outline text-sm"><Phone className="h-4 w-4" /> Call {business.phoneDisplay}</a>
        <Link to="/contact" className="btn-outline text-sm">Contact us</Link>
      </div>
    </div>
  );
}

function ModelCard({ m }: { m: Model }) {
  const mainImg = m.images?.main?.url;
  const priceRange = m.variants
    .filter((v) => v.price != null && v.price_mode !== "hidden" && v.price_mode !== "on_request")
    .map((v) => v.price!) as number[];
  const minPrice = priceRange.length ? Math.min(...priceRange) : null;
  const hasStock = m.variants.some((v) => v.availability === "in_stock");
  const ask = `Assalam-o-Alaikum, I am checking price and availability of ${m.brand.name} ${m.name}. Kindly share details.`;
  return (
    <article className="card-surface group flex flex-col overflow-hidden transition hover:border-primary/50">
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        {mainImg ? <img src={mainImg} alt={`${m.brand.name} ${m.name}`} loading="lazy" className="h-full w-full object-contain p-6 transition duration-500 group-hover:scale-105" /> : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No image</div>}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${hasStock ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
          {hasStock ? "In Stock" : "Check Availability"}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{m.brand.name}</div>
        <h3 className="mt-0.5 font-display text-lg leading-tight text-ink">{m.name}</h3>
        {m.short_desc && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.short_desc}</p>}
        <div className="mt-2 flex flex-wrap gap-1">
          {m.variants.slice(0, 6).map((v) => (
            <span key={v.id} className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-foreground/70">{v.normalized_size}</span>
          ))}
          {m.variants.length > 6 && <span className="text-[10px] text-muted-foreground">+{m.variants.length - 6}</span>}
        </div>
        {minPrice != null && <div className="mt-2 text-sm text-primary font-semibold">From PKR {minPrice.toLocaleString()}</div>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={waLink(ask)} target="_blank" rel="noreferrer" className="btn-primary text-xs"><MessageCircle className="h-3.5 w-3.5" /> Get Price</a>
          <a href={telLink()} className="btn-outline text-xs"><Phone className="h-3.5 w-3.5" /> Call</a>
        </div>
      </div>
    </article>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mt-5 border-t border-border pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>{children}</div>;
}
function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${value === o ? "border-ink bg-ink text-white" : "border-border bg-surface text-foreground/70 hover:border-primary hover:text-primary"}`}>{o}</button>
      ))}
    </div>
  );
}
