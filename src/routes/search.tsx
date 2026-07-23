import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search as SearchIcon, ShieldCheck, HelpCircle, CheckCircle2, MessageCircle } from "lucide-react";
import { searchCatalogue } from "@/lib/search.functions";
import { searchPublicCatalogue } from "@/lib/recommendations.functions";
import { rankProductsForVehiclePublic } from "@/lib/fitments.functions";
import { listVehiclesPublic as listVehPub } from "@/lib/vehicles.functions";
import { LeadForm } from "@/components/LeadForm";
import { waLink } from "@/lib/business";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "tyres", label: "Tyres" },
  { value: "lubricants", label: "Lubricants" },
  { value: "filters", label: "Filters" },
  { value: "maintenance_parts", label: "Maintenance" },
  { value: "car_care", label: "Car Care" },
  { value: "additives", label: "Additives" },
  { value: "accessories", label: "Accessories" },
];

export const Route = createFileRoute("/search")({
  validateSearch: (s) =>
    z.object({
      q: z.string().optional(),
      category: z.string().optional(),
      make: z.string().optional(),
      model: z.string().optional(),
      year: z.coerce.number().int().optional(),
      engine: z.string().optional(),
    }).parse(s),
  head: () => ({ meta: [{ title: "Search — Ghafoor Motors" }, { name: "description", content: "Search tyres, lubricants and parts by name, brand, size, viscosity or part number." }] }),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(params.q ?? "");
  const [cat, setCat] = useState(params.category ?? "");
  const [makeId, setMakeId] = useState(params.make ?? "");
  const [modelId, setModelId] = useState(params.model ?? "");
  const [year, setYear] = useState<string>(params.year ? String(params.year) : "");
  const [engine, setEngine] = useState(params.engine ?? "");

  const loadVeh = useServerFn(listVehPub);
  const veh = useQuery({ queryKey: ["pub-vehicles"], queryFn: () => loadVeh(), staleTime: 5 * 60 * 1000 });
  const makes = ((veh.data?.makes ?? []) as any[]);
  const modelsForMake = ((veh.data?.models ?? []) as any[]).filter((m) => m.make_id === makeId);

  const searchTyres = useServerFn(searchCatalogue);
  const searchCat = useServerFn(searchPublicCatalogue);
  const rankFn = useServerFn(rankProductsForVehiclePublic);

  const tyreRes = useQuery({
    queryKey: ["search-tyres", params.q, params.category],
    queryFn: () => searchTyres({ data: { q: params.q!, category: params.category || null } }),
    enabled: !!params.q && params.q.length > 1 && (!params.category || params.category === "tyres"),
  });
  const catRes = useQuery({
    queryKey: ["search-cat", params.q, params.category],
    queryFn: () => searchCat({ data: { q: params.q ?? "", category: params.category || null, limit: 60, offset: 0 } }),
    enabled: !!params.q && params.q.length > 1,
  });
  const rankRes = useQuery({
    queryKey: ["search-rank", params.model, params.year ?? null, params.engine ?? null],
    queryFn: () => rankFn({ data: { model_id: params.model!, year: params.year ?? null, engine: params.engine || null } }),
    enabled: !!params.model,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: {
      q: q.trim() || undefined,
      category: cat || undefined,
      make: makeId || undefined,
      model: modelId || undefined,
      year: year ? Number(year) : undefined,
      engine: engine.trim() || undefined,
    } });
  };
  const clearVehicle = () => {
    setMakeId(""); setModelId(""); setYear(""); setEngine("");
    navigate({ search: { q: params.q, category: params.category } });
  };

  const rankMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of (rankRes.data ?? []) as any[]) m.set(r.product_id, r);
    return m;
  }, [rankRes.data]);

  const tyreResults = (tyreRes.data ?? []) as any[];
  const catResults = (catRes.data ?? []) as any[];
  const mergedRaw = [
    ...tyreResults,
    ...catResults.map((r: any) => ({
      kind: "family", id: r.id, category: r.category, title: r.name,
      brand_name: r.brand_name, part_number: null, size_or_spec: r.product_type_name,
      images: r.images, slug: r.slug,
    })),
  ];
  const results = mergedRaw
    .map((r) => {
      const fit = r.kind === "family" ? rankMap.get(r.id) : null;
      return { ...r, _fit: fit, _rank: fit ? fit.best_rank : 0 };
    })
    .sort((a, b) => b._rank - a._rank);

  const isFetching = tyreRes.isFetching || catRes.isFetching || rankRes.isFetching;

  const vehicleLabel = (() => {
    if (!params.model) return "";
    const m = ((veh.data?.models ?? []) as any[]).find((x) => x.id === params.model);
    const mk = ((veh.data?.makes ?? []) as any[]).find((x) => x.id === (m?.make_id ?? params.make));
    return [mk?.name, m?.name, params.year, params.engine].filter(Boolean).join(" ");
  })();

  return (
    <>
      <section className="bg-ink py-14 text-white">
        <div className="container-x">
          <p className="eyebrow text-primary">Search</p>
          <h1 className="mt-3 font-display text-3xl md:text-4xl">Find tyres, lubricants and parts</h1>
          <form onSubmit={submit} className="mt-6 space-y-2">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. 195/65 R15, 5W-30, oil filter" className="h-12 w-full rounded-full border border-white/20 bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none" />
              </div>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-12 rounded-full border border-white/20 bg-white/10 px-4 text-sm text-white">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value} className="text-ink">{c.label}</option>)}
              </select>
              <button className="btn-primary text-sm">Search</button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <select value={makeId} onChange={(e) => { setMakeId(e.target.value); setModelId(""); }} className="h-10 rounded-full border border-white/20 bg-white/10 px-3 text-xs text-white">
                <option value="" className="text-ink">Make</option>
                {makes.map((m) => <option key={m.id} value={m.id} className="text-ink">{m.name}</option>)}
              </select>
              <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="h-10 rounded-full border border-white/20 bg-white/10 px-3 text-xs text-white">
                <option value="" className="text-ink">Model</option>
                {modelsForMake.map((m) => <option key={m.id} value={m.id} className="text-ink">{m.name}</option>)}
              </select>
              <input value={year} onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="Year" className="h-10 w-24 rounded-full border border-white/20 bg-white/10 px-3 text-xs text-white placeholder:text-white/60" />
              <input value={engine} onChange={(e) => setEngine(e.target.value)} placeholder="Engine (e.g. 1.3L)" className="h-10 w-40 rounded-full border border-white/20 bg-white/10 px-3 text-xs text-white placeholder:text-white/60" />
              {(makeId || modelId || year || engine) && (
                <button type="button" onClick={clearVehicle} className="rounded-full border border-white/20 px-3 text-xs text-white/80 hover:text-white">Clear vehicle</button>
              )}
            </div>
          </form>
        </div>
      </section>

      <section className="py-10">
        <div className="container-x">
          {vehicleLabel && (
            <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
              Showing best matches for <span className="font-semibold">{vehicleLabel}</span>.
              {!params.year && <span className="ml-1 text-muted-foreground">Add your year for exact-fit ranking.</span>}
            </div>
          )}
          {!params.q && !params.model ? (
            <p className="text-sm text-muted-foreground">Type something above or pick your vehicle to search across the catalogue.</p>
          ) : isFetching ? (
            <p className="text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <div className="space-y-6">
              <div className="card-surface p-8 text-center">
                <h3 className="font-display text-xl">No results</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try a different keyword or vehicle — or ask our expert below.</p>
                {vehicleLabel && (
                  <a href={waLink(`Assalam-o-Alaikum, please confirm parts fitment for my ${vehicleLabel}.`)} target="_blank" rel="noreferrer" className="btn-outline mt-3 inline-flex items-center gap-1 text-xs">
                    <MessageCircle className="h-3 w-3" /> Confirm fitment on WhatsApp
                  </a>
                )}
              </div>
              <LeadForm title="Ask our expert" lead_type="catalogue_no_results" showExtended search_context={{ q: params.q, category: params.category, vehicle: vehicleLabel }} />
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">{results.length} result{results.length === 1 ? "" : "s"}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((r: any) => <ResultCard key={`${r.kind}-${r.id}`} r={r} vehicleLabel={vehicleLabel} yearGiven={!!params.year} />)}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function ResultCard({ r, vehicleLabel, yearGiven }: { r: any; vehicleLabel: string; yearGiven: boolean }) {
  const href = r.kind === "tyre" ? "/tyres" : categoryHref(r.category);
  const img = r.images?.main?.url || null;
  const fit = r._fit;
  return (
    <Link to={href} className="card-surface group overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {img ? <img src={img} alt={r.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{r.category}</div>}
        {fit?.verified && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            <ShieldCheck className="h-3 w-3" /> Verified fit
          </span>
        )}
        {fit && !fit.verified && !fit.needs_year_confirmation && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            <CheckCircle2 className="h-3 w-3" /> Commonly fitted
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
          <span className="text-primary">{r.brand_name ?? "—"}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{r.kind === "tyre" ? "Tyre" : r.category.replace(/_/g, " ")}</span>
        </div>
        <h3 className="mt-1 font-display text-lg text-ink line-clamp-2">{r.title}</h3>
        {r.size_or_spec && <p className="mt-1 text-xs text-muted-foreground">{r.size_or_spec}</p>}
        {r.part_number && <p className="text-xs text-muted-foreground">P/N: {r.part_number}</p>}
        {fit?.needs_year_confirmation && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800">
            <HelpCircle className="h-3 w-3" /> {yearGiven ? "Confirm your variant" : "Confirm your year/variant"}
          </p>
        )}
      </div>
    </Link>
  );
}

function categoryHref(c: string): any {
  switch (c) {
    case "tyres": return "/tyres";
    case "lubricants": return "/lubricants";
    case "filters": return "/filters";
    case "maintenance_parts": return "/maintenance-parts";
    case "car_care": return "/car-care";
    case "additives": return "/additives";
    case "accessories": return "/accessories";
    default: return "/";
  }
}
