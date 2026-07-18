import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Phone, Search, Car } from "lucide-react";
import { CTASection } from "@/components/CTASection";
import { LeadForm } from "@/components/LeadForm";
import { listPublishedCatalogue } from "@/lib/catalogue.functions";
import { listVehiclesPublic } from "@/lib/vehicles.functions";
import { findVariantsByVehicle } from "@/lib/compatibility.functions";
import { waTyreLink } from "@/lib/whatsapp";
import { business, telLink, waLink } from "@/lib/business";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/tyres")({
  head: () => ({
    meta: [
      { title: "Car Tyres in Karachi | Passenger, SUV & Hatchback Tyres | Ghafoor Motors" },
      { name: "description", content: "Find the right tyres for your vehicle or size. Confirm today's price via WhatsApp — Ghafoor Motors, PECHS, Karachi." },
    ],
  }),
  component: TyresPage,
});

type Variant = { id: string; normalized_size: string; width?: number|null; profile?: number|null; rim?: number|null; price_mode: string; price: number|null; availability: string; run_flat: boolean; xl_reinforced: boolean; };
type Model = { id: string; name: string; slug?: string|null; short_desc: string|null; vehicle_categories: string[]; tyre_type?: string|null; images: Record<string, { url: string|null }>; brand: { id: string; name: string; logo_url: string|null }; variants: Variant[]; };

function TyresPage() {
  const fetch = useServerFn(listPublishedCatalogue);
  const fetchV = useServerFn(listVehiclesPublic);
  const findByV = useServerFn(findVariantsByVehicle);
  const { data, isLoading } = useQuery<Model[]>({ queryKey: ["public-catalogue"], queryFn: () => fetch() as any });
  const { data: veh } = useQuery({ queryKey: ["pub-vehicles"], queryFn: () => fetchV() });

  const [mode, setMode] = useState<"size" | "vehicle">("size");
  const [size, setSize] = useState({ width: "", profile: "", rim: "" });
  const [vsel, setVsel] = useState({ make_id: "", vehicle_model_id: "", year: "" });
  const [brand, setBrand] = useState("All");
  const [avail, setAvail] = useState("All");
  const [type, setType] = useState("All");
  const [runFlat, setRunFlat] = useState(false);
  const [variantMatchIds, setVariantMatchIds] = useState<string[] | null>(null);

  const all = data ?? [];
  const brands = useMemo(() => Array.from(new Set(all.map(m => m.brand.name))), [all]);
  const filteredModels = useMemo(() => {
    let list: Model[] = all;
    if (mode === "vehicle" && variantMatchIds) {
      const set = new Set(variantMatchIds);
      list = all
        .map((m) => ({ ...m, variants: m.variants.filter((v) => set.has(v.id)) }))
        .filter((m) => m.variants.length > 0);
    }
    if (brand !== "All") list = list.filter(m => m.brand.name === brand);
    if (type !== "All") list = list.filter(m => m.tyre_type === type);
    if (avail === "in_stock") list = list.filter(m => m.variants.some(v => v.availability === "in_stock"));
    if (runFlat) list = list.filter(m => m.variants.some(v => v.run_flat));
    if (mode === "size" && (size.width || size.profile || size.rim)) {
      list = list.filter(m => m.variants.some(v =>
        (!size.width || String(v.width) === size.width) &&
        (!size.profile || String(v.profile) === size.profile) &&
        (!size.rim || String(v.rim) === size.rim)
      ));
    }
    return list;
  }, [all, brand, avail, type, runFlat, mode, size, variantMatchIds]);

  async function runVehicleSearch() {
    const res = await findByV({ data: {
      vehicle_model_id: vsel.vehicle_model_id || undefined,
      make_id: !vsel.vehicle_model_id && vsel.make_id ? vsel.make_id : undefined,
      year: vsel.year ? Number(vsel.year) : undefined,
    } });
    setVariantMatchIds(res as string[]);
    track("vehicle_search", vsel);
    if (!res.length) track("no_results", { via: "vehicle", vsel });
  }
  function runSizeSearch() {
    track("tyre_size_search", size);
  }
  function reset() {
    setSize({ width: "", profile: "", rim: "" }); setVsel({ make_id: "", vehicle_model_id: "", year: "" });
    setBrand("All"); setAvail("All"); setType("All"); setRunFlat(false); setVariantMatchIds(null);
  }


  const vMakes = veh?.makes ?? [];
  const vModels = (veh?.models ?? []).filter(m => !vsel.make_id || m.make_id === vsel.make_id);
  const widths = useMemo(() => Array.from(new Set(all.flatMap(m => m.variants.map(v => v.width).filter(Boolean)))).sort((a: any,b: any)=>a-b), [all]);
  const profiles = useMemo(() => Array.from(new Set(all.flatMap(m => m.variants.map(v => v.profile).filter(Boolean)))).sort((a: any,b: any)=>a-b), [all]);
  const rims = useMemo(() => Array.from(new Set(all.flatMap(m => m.variants.map(v => v.rim).filter(Boolean)))).sort((a: any,b: any)=>a-b), [all]);

  const noResults = !isLoading && filteredModels.length === 0 && all.length > 0;

  return (
    <>
      <section className="bg-ink py-14 text-white md:py-20">
        <div className="container-x">
          <p className="eyebrow text-primary">Tyres</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Find Tyres for Your Vehicle</h1>
          <p className="mt-3 max-w-2xl text-white/70">Search by size or vehicle, compare options, and confirm today's price via WhatsApp.</p>
        </div>
      </section>

      <div className="container-x -mt-10 relative z-10">
        <div className="card-surface bg-white p-5">
          <div className="flex gap-1 mb-4 text-xs">
            <button onClick={() => setMode("size")} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${mode === "size" ? "bg-ink text-white" : "border border-border"}`}><Search className="h-3.5 w-3.5" /> By Size</button>
            <button onClick={() => setMode("vehicle")} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${mode === "vehicle" ? "bg-ink text-white" : "border border-border"}`}><Car className="h-3.5 w-3.5" /> By Vehicle</button>
          </div>
          {mode === "size" ? (
            <div className="grid gap-3 sm:grid-cols-4">
              <SelectField label="Width" value={size.width} onChange={(v) => setSize({ ...size, width: v })} options={widths.map(String)} placeholder="Any" />
              <SelectField label="Profile" value={size.profile} onChange={(v) => setSize({ ...size, profile: v })} options={profiles.map(String)} placeholder="Any" />
              <SelectField label="Rim" value={size.rim} onChange={(v) => setSize({ ...size, rim: v })} options={rims.map(String)} placeholder="Any" />
              <button onClick={runSizeSearch} className="btn-primary text-sm self-end">Show Matching Tyres</button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-4">
              <SelectField label="Make" value={vsel.make_id} onChange={(v) => setVsel({ make_id: v, vehicle_model_id: "", year: "" })}
                options={vMakes.map(m => ({ value: m.id, label: m.name }))} placeholder="Select make" />
              <SelectField label="Model" value={vsel.vehicle_model_id} onChange={(v) => setVsel({ ...vsel, vehicle_model_id: v })}
                options={vModels.map(m => ({ value: m.id, label: m.name }))} placeholder="Select model" disabled={!vsel.make_id} />
              <SelectField label="Year" value={vsel.year} onChange={(v) => setVsel({ ...vsel, year: v })}
                options={Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i))} placeholder="Any" />
              <button onClick={runVehicleSearch} disabled={!vsel.vehicle_model_id} className="btn-primary text-sm self-end disabled:opacity-50">Show Compatible</button>
            </div>
          )}
        </div>
      </div>

      <section className="py-14">
        <div className="container-x">
          {isLoading ? <div className="card-surface p-10 text-center text-sm text-muted-foreground">Loading…</div> :
           all.length === 0 ? <EmptyCatalogue /> : (
            <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
              <aside className="card-surface h-fit p-5 text-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base text-ink">Filters</h3>
                  <button onClick={reset} className="text-xs text-primary hover:underline">Reset</button>
                </div>
                <FilterGroup label="Brand">
                  <select value={brand} onChange={(e) => setBrand(e.target.value)} className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm">
                    {["All", ...brands].map(o => <option key={o}>{o}</option>)}
                  </select>
                </FilterGroup>
                <FilterGroup label="Availability">
                  <select value={avail} onChange={(e) => setAvail(e.target.value)} className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm">
                    <option value="All">Any</option><option value="in_stock">In Stock</option>
                  </select>
                </FilterGroup>
                <FilterGroup label="Tyre type">
                  <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm">
                    <option value="All">Any</option>
                    <option value="passenger">Passenger</option>
                    <option value="suv_4x4">SUV / 4x4</option>
                    <option value="commercial">Commercial</option>
                    <option value="other">Other</option>
                  </select>
                </FilterGroup>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={runFlat} onChange={(e) => setRunFlat(e.target.checked)} className="accent-primary" /> Run-flat only
                </label>
              </aside>

              <div>
                <p className="mb-4 text-sm text-muted-foreground">{filteredModels.length} model{filteredModels.length === 1 ? "" : "s"}</p>
                {noResults ? (
                  <NoResults size={mode === "size" ? size : undefined} vehicle={mode === "vehicle" ? { vsel, veh } : undefined} />
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredModels.map(m => <ModelCard key={m.id} m={m} />)}
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

function SelectField({ label, value, onChange, options, placeholder, disabled }: { label: string; value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; placeholder?: string; disabled?: boolean }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-semibold text-muted-foreground">{label}</span>
      <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-border bg-white px-2 text-sm disabled:opacity-50">
        <option value="">{placeholder ?? "Any"}</option>
        {options.map(o => typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function NoResults({ size, vehicle }: any) {
  const sizeStr = size?.width && size?.profile && size?.rim ? `${size.width}/${size.profile} R${size.rim}` : undefined;
  const vMake = vehicle?.veh?.makes.find((m: any) => m.id === vehicle?.vsel?.make_id)?.name;
  const vModel = vehicle?.veh?.models.find((m: any) => m.id === vehicle?.vsel?.vehicle_model_id)?.name;
  const ctx = { size: sizeStr, vehicle: { make: vMake, model: vModel, year: vehicle?.vsel?.year } };
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card-surface bg-white p-6">
        <h3 className="font-display text-xl text-ink">Let our tyre expert find it for you</h3>
        <p className="mt-2 text-sm text-muted-foreground">We stock many sizes not shown online. Message us on WhatsApp and we'll suggest the best match today.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={waTyreLink(ctx)} target="_blank" rel="noreferrer" className="btn-primary text-sm"><MessageCircle className="h-4 w-4" /> Ask on WhatsApp</a>
          <a href={telLink()} className="btn-outline text-sm"><Phone className="h-4 w-4" /> Call {business.phoneDisplay}</a>
        </div>
      </div>
      <LeadForm title="Or leave your number" tyre_size={sizeStr} vehicle_make={vMake} vehicle_model={vModel} vehicle_year={vehicle?.vsel?.year} search_context={ctx} />
    </div>
  );
}

function EmptyCatalogue() {
  return (
    <div className="card-surface p-10 text-center">
      <h2 className="font-display text-2xl md:text-3xl text-ink">Our online catalogue is being updated.</h2>
      <p className="mt-3 max-w-xl mx-auto text-muted-foreground">Share your vehicle and size on WhatsApp — we'll suggest options and today's price.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <a href={waLink("Assalam-o-Alaikum, please suggest suitable tyres for my vehicle.")} target="_blank" rel="noreferrer" className="btn-primary text-sm"><MessageCircle className="h-4 w-4" /> Ask on WhatsApp</a>
        <a href={telLink()} className="btn-outline text-sm"><Phone className="h-4 w-4" /> Call {business.phoneDisplay}</a>
      </div>
    </div>
  );
}

function ModelCard({ m }: { m: Model }) {
  const mainImg = m.images?.main?.url;
  const prices = m.variants.filter(v => v.price != null && v.price_mode !== "hidden" && v.price_mode !== "on_request").map(v => v.price!) as number[];
  const minPrice = prices.length ? Math.min(...prices) : null;
  const hasStock = m.variants.some(v => v.availability === "in_stock");
  const detailPath = m.slug ? `/tyres/${m.slug}` : undefined;
  const ask = { brand: m.brand.name, model: m.name };
  return (
    <article className="card-surface group flex flex-col overflow-hidden transition hover:border-primary/50">
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        {mainImg ? <img src={mainImg} alt={`${m.brand.name} ${m.name}`} loading="lazy" className="h-full w-full object-contain p-6 transition duration-500 group-hover:scale-105" /> : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No image</div>}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${hasStock ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{hasStock ? "In Stock" : "Check Availability"}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{m.brand.name}</div>
        <h3 className="mt-0.5 font-display text-lg leading-tight text-ink">{m.name}</h3>
        {m.short_desc && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.short_desc}</p>}
        <div className="mt-2 flex flex-wrap gap-1">
          {m.variants.slice(0, 6).map(v => <span key={v.id} className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-foreground/70">{v.normalized_size}</span>)}
          {m.variants.length > 6 && <span className="text-[10px] text-muted-foreground">+{m.variants.length - 6}</span>}
        </div>
        {minPrice != null && <div className="mt-2 text-sm text-primary font-semibold">From PKR {minPrice.toLocaleString()}</div>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {detailPath ? <Link to={detailPath as any} className="btn-outline text-xs">View Details</Link> : <span />}
          <a href={waTyreLink(ask)} onClick={() => track("whatsapp_click", { model: m.name })} target="_blank" rel="noreferrer" className="btn-primary text-xs"><MessageCircle className="h-3.5 w-3.5" /> Get Price</a>
        </div>
      </div>
    </article>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mt-4 border-t border-border pt-3"><p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>{children}</div>;
}
