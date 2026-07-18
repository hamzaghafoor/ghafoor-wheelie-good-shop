import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Phone } from "lucide-react";
import { TyreFinder } from "@/components/TyreFinder";
import { CTASection } from "@/components/CTASection";
import { listPublishedTyres } from "@/lib/tyres.functions";
import { business, telLink, waLink } from "@/lib/business";

export const Route = createFileRoute("/tyres")({
  head: () => ({
    meta: [
      { title: "Car Tyres in Karachi | Passenger, SUV & Hatchback Tyres | Ghafoor Motors" },
      { name: "description", content: "Browse suitable tyre options for sedans, hatchbacks and SUVs. Get today's price and check availability via WhatsApp — Ghafoor Motors, PECHS, Karachi." },
    ],
  }),
  component: TyresPage,
});

type PublicTyre = {
  id: string; brand: string; model: string; size: string; category: string;
  price: number | null; currency: string; in_stock: boolean;
  image_url: string | null; image_signed_url: string | null;
  description: string | null; features: string[]; vehicles: string[];
};

function TyresPage() {
  const fetchTyres = useServerFn(listPublishedTyres);
  const { data, isLoading } = useQuery<PublicTyre[]>({
    queryKey: ["public-tyres"],
    queryFn: () => fetchTyres() as any,
  });

  const [cat, setCat] = useState<string>("All");
  const [brand, setBrand] = useState<string>("All");
  const [availOnly, setAvailOnly] = useState(false);

  const all = data ?? [];
  const brands = useMemo(() => Array.from(new Set(all.map((t) => t.brand))), [all]);
  const categories = useMemo(() => Array.from(new Set(all.map((t) => t.category))), [all]);
  const filtered = useMemo(() => all.filter((t) =>
    (cat === "All" || t.category === cat) &&
    (brand === "All" || t.brand === brand) &&
    (!availOnly || t.in_stock)
  ), [all, cat, brand, availOnly]);

  return (
    <>
      <section className="bg-ink py-14 text-white md:py-20">
        <div className="container-x">
          <p className="eyebrow text-primary">Tyres</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Find Tyres for Your Vehicle</h1>
          <p className="mt-3 max-w-2xl text-white/70">Search by vehicle or tyre size, compare suitable options, and contact us for current pricing and availability.</p>
        </div>
      </section>

      <div className="container-x -mt-10 relative z-10">
        <TyreFinder compact />
      </div>

      <section className="py-14">
        <div className="container-x">
          {isLoading ? (
            <div className="card-surface p-10 text-center text-sm text-muted-foreground">Loading tyre catalogue…</div>
          ) : all.length === 0 ? (
            <EmptyCatalogue />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
              <aside className="card-surface h-fit p-5">
                <h3 className="font-display text-lg text-ink">Filters</h3>
                <FilterGroup label="Vehicle category">
                  <Chips options={["All", ...categories]} value={cat} onChange={setCat} />
                </FilterGroup>
                <FilterGroup label="Brand">
                  <select value={brand} onChange={(e) => setBrand(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-surface px-2 text-sm">
                    {["All", ...brands].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </FilterGroup>
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={availOnly} onChange={(e) => setAvailOnly(e.target.checked)} className="accent-primary" />
                  In stock only
                </label>
              </aside>

              <div>
                <p className="mb-4 text-sm text-muted-foreground">{filtered.length} option{filtered.length === 1 ? "" : "s"}</p>
                {filtered.length === 0 ? (
                  <div className="card-surface p-10 text-center">
                    <h3 className="font-display text-2xl text-ink">No matching tyres.</h3>
                    <p className="mt-2 text-muted-foreground">Contact us with your vehicle or tyre size and we'll suggest suitable alternatives.</p>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((t) => <TyreDbCard key={t.id} t={t} />)}
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
        Our team stocks a wide range of tyres for sedans, hatchbacks, SUVs and commercial vehicles.
        Share your vehicle and tyre size with us on WhatsApp — we'll suggest suitable options and today's price.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <a href={waLink("Assalam-o-Alaikum, please suggest suitable tyres for my vehicle.")} target="_blank" rel="noreferrer" className="btn-primary text-sm">
          <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
        </a>
        <a href={telLink()} className="btn-outline text-sm">
          <Phone className="h-4 w-4" /> Call {business.phoneDisplay}
        </a>
        <Link to="/contact" className="btn-outline text-sm">Contact us</Link>
      </div>
    </div>
  );
}

function TyreDbCard({ t }: { t: PublicTyre }) {
  const ask = `Assalam-o-Alaikum, I am checking price and availability of ${t.brand} ${t.model}, size ${t.size}. Kindly share details.`;
  return (
    <article className="card-surface group flex flex-col overflow-hidden transition hover:border-primary/50">
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        {t.image_signed_url ? (
          <img src={t.image_signed_url} alt={`${t.brand} ${t.model}`} loading="lazy"
            className="h-full w-full object-contain p-6 transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No image</div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${t.in_stock ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
          {t.in_stock ? "In Stock" : "Check Availability"}
        </span>
        <span className="absolute right-3 top-3 rounded-full border border-border bg-surface/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">{t.category}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t.brand}</div>
        <h3 className="mt-0.5 font-display text-lg leading-tight text-ink">{t.model}</h3>
        <div className="mt-1 text-sm font-medium text-foreground/80">{t.size}</div>
        {t.price != null && <div className="mt-1 text-sm text-primary font-semibold">{t.currency} {t.price.toLocaleString()}</div>}
        {t.features.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {t.features.slice(0, 3).map((f) => (
              <li key={f} className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 flex-none rounded-full bg-primary" />{f}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={waLink(ask)} target="_blank" rel="noreferrer" className="btn-primary text-xs">
            <MessageCircle className="h-3.5 w-3.5" /> Get Price
          </a>
          <a href={telLink()} className="btn-outline text-xs">
            <Phone className="h-3.5 w-3.5" /> Call
          </a>
        </div>
      </div>
    </article>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
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
