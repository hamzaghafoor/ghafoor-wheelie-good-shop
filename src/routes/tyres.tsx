import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { tyres, tyreBrands, tyreCategories, tyrePriorities, type TyreCategory, type TyrePriority } from "@/lib/tyres";
import { tyreRims } from "@/lib/vehicles";
import { ProductCard } from "@/components/ProductCard";
import { TyreFinder } from "@/components/TyreFinder";
import { CTASection } from "@/components/CTASection";

export const Route = createFileRoute("/tyres")({
  head: () => ({
    meta: [
      { title: "Car Tyres in Karachi | Passenger, SUV & Hatchback Tyres | Ghafoor Motors" },
      { name: "description", content: "Browse suitable tyre options for sedans, hatchbacks and SUVs. Get today's price and check availability via WhatsApp — Ghafoor Motors, PECHS, Karachi." },
    ],
  }),
  component: TyresPage,
});

function TyresPage() {
  const [cat, setCat] = useState<TyreCategory | "All">("All");
  const [brand, setBrand] = useState<string>("All");
  const [rim, setRim] = useState<string>("All");
  const [priority, setPriority] = useState<TyrePriority | "All">("All");
  const [availOnly, setAvailOnly] = useState(false);
  const [sort, setSort] = useState<"recommended" | "brand" | "size">("recommended");

  const filtered = useMemo(() => {
    let out = tyres.filter((t) =>
      (cat === "All" || t.category === cat) &&
      (brand === "All" || t.brand === brand) &&
      (rim === "All" || t.sizes.some((s) => s.endsWith(`R${rim}`))) &&
      (priority === "All" || t.priorities.includes(priority)) &&
      (!availOnly || t.inStock)
    );
    if (sort === "brand") out = [...out].sort((a, b) => a.brand.localeCompare(b.brand));
    if (sort === "size") out = [...out].sort((a, b) => a.sizes[0].localeCompare(b.sizes[0]));
    return out;
  }, [cat, brand, rim, priority, availOnly, sort]);

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
        <div className="container-x grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="card-surface h-fit p-5">
            <h3 className="font-display text-lg text-ink">Filters</h3>
            <FilterGroup label="Vehicle category">
              <Chips options={["All", ...tyreCategories]} value={cat} onChange={(v) => setCat(v as any)} />
            </FilterGroup>
            <FilterGroup label="Brand">
              <SelectPlain value={brand} onChange={setBrand} options={["All", ...tyreBrands]} />
            </FilterGroup>
            <FilterGroup label="Rim size">
              <Chips options={["All", ...tyreRims]} value={rim} onChange={setRim} />
            </FilterGroup>
            <FilterGroup label="Driving priority">
              <Chips options={["All", ...tyrePriorities]} value={priority} onChange={(v) => setPriority(v as any)} />
            </FilterGroup>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={availOnly} onChange={(e) => setAvailOnly(e.target.checked)} className="accent-primary" />
              In stock only
            </label>
          </aside>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{filtered.length} option{filtered.length === 1 ? "" : "s"}</p>
              <label className="text-sm">
                <span className="mr-2 text-muted-foreground">Sort:</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm">
                  <option value="recommended">Recommended</option>
                  <option value="brand">Brand A–Z</option>
                  <option value="size">Size</option>
                </select>
              </label>
            </div>
            {filtered.length === 0 ? (
              <div className="card-surface p-10 text-center">
                <h3 className="font-display text-2xl text-ink">We'll help you find the right option.</h3>
                <p className="mt-2 text-muted-foreground">Contact us with your vehicle or tyre size and we'll suggest suitable alternatives.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((t) => <ProductCard key={t.id} tyre={t} />)}
              </div>
            )}
          </div>
        </div>
      </section>
      <CTASection />
    </>
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
function SelectPlain({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-border bg-surface px-2 text-sm">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
