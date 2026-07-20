import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MessageCircle, Phone, Layers } from "lucide-react";
import { CTASection } from "@/components/CTASection";
import { LeadForm } from "@/components/LeadForm";
import { TyreFinderShared } from "@/components/finder/TyreFinderShared";
import { searchTyres, finderOemSizes, finderMakes, finderModels, finderConfigurations } from "@/lib/finder.functions";
import { waTyreLink } from "@/lib/whatsapp";
import { business, telLink, waLink } from "@/lib/business";
import { track } from "@/lib/analytics";

const searchSchema = z.object({
  mode: z.enum(["size", "vehicle"]).optional(),
  w: z.coerce.number().int().optional(),
  p: z.coerce.number().int().optional(),
  r: z.coerce.number().optional(),
  make: z.string().uuid().optional(),
  model: z.string().uuid().optional(),
  year: z.coerce.number().int().optional(),
  config: z.string().uuid().optional(),
  brand: z.string().uuid().optional(),
  avail: z.string().optional(),
  type: z.string().optional(),
  rf: z.coerce.boolean().optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "availability"]).optional(),
  page: z.coerce.number().int().positive().optional(),
});

export const Route = createFileRoute("/tyres")({
  validateSearch: (raw) => searchSchema.parse(raw),
  head: () => ({
    meta: [
      { title: "Car Tyres in Karachi | Passenger, SUV & Hatchback Tyres | Ghafoor Motors" },
      { name: "description", content: "Find the right tyres for your vehicle or size. Confirm today's price via WhatsApp — Ghafoor Motors, PECHS, Karachi." },
    ],
  }),
  component: TyresPage,
});

type Row = {
  variant_id: string; model_id: string; model_name: string; model_slug: string | null;
  short_desc: string | null; tyre_type: string | null; images: any;
  brand_id: string; brand_name: string; brand_logo_url: string | null;
  normalized_size: string; width: number | null; profile: number | null; rim: string | number | null;
  load_index: string | null; speed_rating: string | null;
  price_mode: string; price: string | number | null; previous_price: string | number | null;
  availability: string; run_flat: boolean; xl_reinforced: boolean; tubeless: boolean;
  total_count: number;
};

function TyresPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/tyres" });
  const mode = search.mode ?? "size";
  const page = search.page ?? 1;
  const sort = search.sort ?? "relevance";

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) as any });

  const searchFn = useServerFn(searchTyres);
  const oemFn = useServerFn(finderOemSizes);
  const makesFn = useServerFn(finderMakes);
  const modelsFn = useServerFn(finderModels);
  const configsFn = useServerFn(finderConfigurations);

  // For a vehicle search with a chosen configuration, fetch OEM sizes and issue a search per size.
  const oem = useQuery({
    queryKey: ["oem-sizes", search.config],
    queryFn: () => oemFn({ data: { configuration_id: search.config! } }),
    enabled: mode === "vehicle" && !!search.config,
  });

  // Labels for lead context (only when in vehicle mode).
  const makesQ = useQuery({ queryKey: ["v-makes"], queryFn: () => makesFn(), enabled: mode === "vehicle" });
  const modelsQ = useQuery({
    queryKey: ["v-models", search.make], queryFn: () => modelsFn({ data: { make_id: search.make! } }),
    enabled: mode === "vehicle" && !!search.make,
  });
  const configsQ = useQuery({
    queryKey: ["v-configs", search.model, search.year], queryFn: () => configsFn({ data: { model_id: search.model!, year: search.year ?? null } }),
    enabled: mode === "vehicle" && !!search.model,
  });
  const makeLabel = (makesQ.data ?? []).find((m: any) => m.id === search.make)?.name;
  const modelLabel = (modelsQ.data ?? []).find((m: any) => m.id === search.model)?.name;
  const configLabel = (() => {
    const c = (configsQ.data ?? []).find((c: any) => c.id === search.config);
    if (!c) return undefined;
    return [c.trim_name, c.engine_name, c.engine_capacity_cc ? `${c.engine_capacity_cc}cc` : null].filter(Boolean).join(" · ");
  })();

  // Compute effective search sets.
  const oemSets = useMemo(() => {
    const rows = (oem.data ?? []) as any[];
    if (!rows.length) return [] as Array<{ key: string; label: string; position: "front" | "rear" | "all"; width: number; profile: number; rim: number; staggered: boolean }>;
    const sets: any[] = [];
    for (const s of rows) {
      const staggered = s.layout === "staggered" && s.rear_width && s.rear_profile && s.rear_rim;
      sets.push({ key: `${s.id}-front`, label: staggered ? "Front" : "OEM size", position: staggered ? "front" : "all", width: s.front_width, profile: s.front_profile, rim: s.front_rim, staggered: !!staggered });
      if (staggered) {
        sets.push({ key: `${s.id}-rear`, label: "Rear", position: "rear", width: s.rear_width, profile: s.rear_profile, rim: s.rear_rim, staggered: true });
      }
    }
    // Dedupe by width/profile/rim/position
    const seen = new Set<string>();
    return sets.filter((s) => {
      const k = `${s.position}-${s.width}-${s.profile}-${s.rim}`;
      if (seen.has(k)) return false; seen.add(k); return true;
    });
  }, [oem.data]);

  const commonFilters = {
    brand_id: search.brand ?? null,
    availability: search.avail && search.avail !== "All" ? search.avail : null,
    tyre_type: search.type && search.type !== "All" ? search.type : null,
    run_flat: search.rf ? true : null,
    sort, page, page_size: 24,
  };

  // Size mode: one search.
  const sizeQuery = useQuery({
    queryKey: ["search-size", search.w, search.p, search.r, search.brand, search.avail, search.type, search.rf, sort, page],
    queryFn: () => searchFn({ data: { ...commonFilters, width: search.w ?? null, profile: search.p ?? null, rim: search.r ?? null } }),
    enabled: mode === "size" && !!search.w,
  });

  // Vehicle mode with config: run one combined search across all OEM sets.
  const vehicleQuery = useQuery({
    queryKey: ["search-vehicle", oemSets.map((s) => s.key).join("|"), search.brand, search.avail, search.type, search.rf, sort, page],
    queryFn: async () => {
      const results = await Promise.all(
        oemSets.map((s) => searchFn({ data: { ...commonFilters, width: s.width, profile: s.profile, rim: s.rim } }))
      );
      return results;
    },
    enabled: mode === "vehicle" && oemSets.length > 0,
  });

  // No-results analytics de-dup.
  const lastNoResultsKey = useRef<string>("");
  useEffect(() => {
    if (mode === "size" && sizeQuery.isFetched) {
      const total = sizeQuery.data?.total ?? 0;
      const key = `size:${search.w}:${search.p}:${search.r}:${total}`;
      if (total === 0 && !!search.w && key !== lastNoResultsKey.current) {
        lastNoResultsKey.current = key;
        track("no_results", { via: "size", w: search.w, p: search.p, r: search.r });
      }
    }
    if (mode === "vehicle" && oemSets.length && vehicleQuery.isFetched) {
      const total = (vehicleQuery.data ?? []).reduce((n: number, q: any) => n + (q?.total ?? 0), 0);
      const key = `veh:${search.config}:${total}`;
      if (total === 0 && key !== lastNoResultsKey.current) {
        lastNoResultsKey.current = key;
        track("no_results", { via: "vehicle", make: search.make, model: search.model, year: search.year, config: search.config });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sizeQuery.data, vehicleQuery.data]);

  const searchInitiated = mode === "size" ? !!search.w : (mode === "vehicle" && (!!search.config || !!search.model));

  return (
    <>
      <section className="bg-ink py-10 text-white md:py-16">
        <div className="container-x">
          <p className="eyebrow text-primary">Tyres</p>
          <h1 className="mt-3 font-display text-3xl md:text-5xl">Find Tyres for Your Vehicle</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">Search by size or vehicle. Confirm today's price via WhatsApp.</p>
        </div>
      </section>

      <div className="container-x -mt-8 relative z-10">
        <TyreFinderShared
          variant="page"
          initial={{
            mode, w: search.w ?? null, p: search.p ?? null, r: search.r ?? null,
            make: search.make ?? null, model: search.model ?? null, year: search.year ?? null, config: search.config ?? null,
          }}
          onSubmit={(q) => {
            const patch: any = {
              mode: q.get("mode") ?? "size",
              w: q.get("w") ? Number(q.get("w")) : undefined,
              p: q.get("p") ? Number(q.get("p")) : undefined,
              r: q.get("r") ? Number(q.get("r")) : undefined,
              make: q.get("make") ?? undefined,
              model: q.get("model") ?? undefined,
              year: q.get("year") ? Number(q.get("year")) : undefined,
              config: q.get("config") ?? undefined,
              page: 1,
            };
            navigate({ search: patch });
          }}
        />
      </div>

      <section className="py-10 md:py-14">
        <div className="container-x grid gap-6 lg:grid-cols-[240px_1fr]">
          <FiltersSidebar
            sort={sort}
            avail={search.avail ?? "All"} type={search.type ?? "All"} rf={!!search.rf}
            onChange={(patch) => setSearch({ ...patch, page: 1 })}
          />

          <div>
            {!searchInitiated ? (
              <div className="card-surface p-8 text-center text-sm text-muted-foreground">
                Choose a size or vehicle above to see matching tyres.
              </div>
            ) : mode === "size" ? (
              <ResultsBlock
                title={`Results for ${search.w}${search.p ? `/${search.p}` : ""}${search.r ? ` R${search.r}` : ""}`}
                loading={sizeQuery.isLoading}
                error={sizeQuery.error as Error | null}
                onRetry={() => sizeQuery.refetch()}
                rows={(sizeQuery.data?.rows ?? []) as Row[]}
                total={sizeQuery.data?.total ?? 0}
                page={page} pageSize={24}
                onPage={(n) => setSearch({ page: n })}
                emptyContext={{
                  mode: "size", w: search.w, p: search.p, r: search.r,
                  size_label: search.w ? `${search.w}${search.p ? `/${search.p}` : ""}${search.r ? ` R${search.r}` : ""}` : undefined,
                }}
              />
            ) : oemSets.length === 0 ? (
              search.config ? (
                <div className="card-surface p-6 text-sm text-muted-foreground">
                  No OEM tyre sizes are on file for the selected trim yet. Please <b>Confirm with our expert</b> below.
                  <div className="mt-4"><ExpertPrompt vehicle={{ make: makeLabel, model: modelLabel, year: search.year, config: configLabel }} /></div>
                </div>
              ) : (
                <div className="card-surface p-6 text-sm text-muted-foreground">
                  Pick a trim/engine above to load OEM tyre sizes, or switch to <b>By Size</b>.
                </div>
              )
            ) : (
              <div className="space-y-8">
                {oemSets.map((s, i) => (
                  <ResultsBlock
                    key={s.key}
                    title={s.staggered ? `${s.label} — ${s.width}/${s.profile} R${s.rim}` : `Recommended size — ${s.width}/${s.profile} R${s.rim}`}
                    subtitle={i === 0 && oemSets.some((x) => x.staggered) ? "This vehicle uses a staggered layout — front and rear sizes differ." : undefined}
                    loading={vehicleQueries[i]?.isLoading}
                    error={vehicleQueries[i]?.error as Error | null}
                    onRetry={() => vehicleQueries[i]?.refetch()}
                    rows={(vehicleQueries[i]?.data?.rows ?? []) as Row[]}
                    total={vehicleQueries[i]?.data?.total ?? 0}
                    page={page} pageSize={24}
                    onPage={(n) => setSearch({ page: n })}
                    emptyContext={{
                      mode: "vehicle", w: s.width, p: s.profile, r: s.rim,
                      size_label: `${s.width}/${s.profile} R${s.rim}`,
                      vehicle: { make: makeLabel, model: modelLabel, year: search.year, config: configLabel },
                      position: s.position,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <CTASection />
    </>
  );
}

function FiltersSidebar({ sort, avail, type, rf, onChange }: {
  sort: string; avail: string; type: string; rf: boolean;
  onChange: (p: Partial<{ sort: any; avail: string; type: string; rf: boolean }>) => void;
}) {
  return (
    <aside className="card-surface h-fit p-4 text-sm">
      <h3 className="font-display text-base text-ink">Sort & filter</h3>
      <label className="mt-3 block text-xs">
        <span className="mb-1 block font-semibold uppercase tracking-wider text-muted-foreground">Sort</span>
        <select value={sort} onChange={(e) => onChange({ sort: e.target.value as any })} className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm">
          <option value="relevance">Relevance</option>
          <option value="availability">In stock first</option>
          <option value="price_asc">Price · low to high</option>
          <option value="price_desc">Price · high to low</option>
        </select>
      </label>
      <label className="mt-3 block text-xs">
        <span className="mb-1 block font-semibold uppercase tracking-wider text-muted-foreground">Availability</span>
        <select value={avail} onChange={(e) => onChange({ avail: e.target.value })} className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm">
          <option value="All">Any</option>
          <option value="in_stock">In Stock</option>
        </select>
      </label>
      <label className="mt-3 block text-xs">
        <span className="mb-1 block font-semibold uppercase tracking-wider text-muted-foreground">Tyre type</span>
        <select value={type} onChange={(e) => onChange({ type: e.target.value })} className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm">
          <option value="All">Any</option>
          <option value="passenger">Passenger</option>
          <option value="suv_4x4">SUV / 4x4</option>
          <option value="commercial">Commercial</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={rf} onChange={(e) => onChange({ rf: e.target.checked })} className="accent-primary" /> Run-flat only
      </label>
    </aside>
  );
}

function ResultsBlock({ title, subtitle, loading, error, onRetry, rows, total, page, pageSize, onPage, emptyContext }: {
  title: string; subtitle?: string; loading?: boolean; error?: Error | null; onRetry?: () => void;
  rows: Row[]; total: number; page: number; pageSize: number;
  onPage: (n: number) => void; emptyContext: any;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <section>
      <div className="mb-3">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        <p className="text-xs text-muted-foreground" aria-live="polite">{loading ? "Loading…" : `${total} match${total === 1 ? "" : "es"}`}</p>
      </div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card-surface h-64 animate-pulse bg-surface-2" />)}
        </div>
      ) : error ? (
        <div className="card-surface p-6 text-sm">
          <p className="text-red-600">Could not load results. {error.message}</p>
          <button onClick={onRetry} className="btn-outline mt-3 text-sm">Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <NoResults ctx={emptyContext} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => <TyreCard key={r.variant_id} r={r} />)}
          </div>
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-outline h-9 text-sm disabled:opacity-50">Prev</button>
              <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
              <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="btn-outline h-9 text-sm disabled:opacity-50">Next</button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function TyreCard({ r }: { r: Row }) {
  const img = r.images?.main?.url ?? null;
  const price = r.price != null && r.price_mode !== "hidden" && r.price_mode !== "on_request" ? Number(r.price) : null;
  const detail = r.model_slug ? `/tyres/${r.model_slug}` : undefined;
  const inStock = r.availability === "in_stock";
  return (
    <article className="card-surface flex flex-col overflow-hidden">
      <div className="relative aspect-square bg-surface-2">
        {img ? <img src={img} alt={`${r.brand_name} ${r.model_name}`} loading="lazy" className="h-full w-full object-contain p-6" /> : <div className="grid h-full place-items-center text-xs text-muted-foreground">No image</div>}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${inStock ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{inStock ? "In Stock" : "Check Availability"}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{r.brand_name}</div>
        <h3 className="mt-0.5 font-display text-base leading-tight text-ink">{r.model_name}</h3>
        <div className="mt-1 text-xs text-muted-foreground">{r.normalized_size}{r.load_index ? ` · ${r.load_index}${r.speed_rating ?? ""}` : ""}</div>
        <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
          {r.run_flat && <span className="rounded border border-border bg-surface px-1.5 py-0.5">Run-flat</span>}
          {r.xl_reinforced && <span className="rounded border border-border bg-surface px-1.5 py-0.5">XL</span>}
          {r.tubeless && <span className="rounded border border-border bg-surface px-1.5 py-0.5">Tubeless</span>}
        </div>
        {price != null && <div className="mt-2 text-sm font-semibold text-primary">PKR {price.toLocaleString()}</div>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {detail ? <Link to={detail as any} className="btn-outline text-xs">View Details</Link> : <span />}
          <a href={waTyreLink({ brand: r.brand_name, model: r.model_name, size: r.normalized_size })}
             onClick={() => track("whatsapp_click", { model: r.model_name, size: r.normalized_size })}
             target="_blank" rel="noreferrer" className="btn-primary text-xs">
            <MessageCircle className="h-3.5 w-3.5" /> Get Price
          </a>
        </div>
      </div>
    </article>
  );
}

function NoResults({ ctx }: { ctx: any }) {
  const size = ctx.size_label;
  const veh = ctx.vehicle;
  const leadCtx = {
    mode: ctx.mode,
    size,
    width: ctx.w, profile: ctx.p, rim: ctx.r,
    make: veh?.make, model: veh?.model, year: veh?.year, configuration: veh?.config,
    position: ctx.position,
    source_page: "/tyres",
  };
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card-surface bg-white p-6">
        <div className="flex items-center gap-2 text-primary"><Layers className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">No online match</span></div>
        <h3 className="mt-2 font-display text-xl text-ink">We stock many sizes not shown online</h3>
        <p className="mt-2 text-sm text-muted-foreground">Ask our tyre expert on WhatsApp — they'll suggest the best available match and today's price.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={waTyreLink({ size, vehicle: veh, extra: ctx.position === "rear" ? "Rear tyre size." : ctx.position === "front" ? "Front tyre size." : undefined })}
             target="_blank" rel="noreferrer" className="btn-primary text-sm">
            <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
          </a>
          <a href={telLink()} className="btn-outline text-sm"><Phone className="h-4 w-4" /> Call {business.phoneDisplay}</a>
        </div>
      </div>
      <LeadForm
        title="Or leave your number"
        tyre_size={size}
        vehicle_make={veh?.make} vehicle_model={veh?.model} vehicle_year={veh?.year ? String(veh.year) : undefined}
        search_context={leadCtx}
      />
    </div>
  );
}

function ExpertPrompt({ vehicle }: { vehicle: any }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <a href={waTyreLink({ vehicle })} target="_blank" rel="noreferrer" className="btn-primary text-sm">
        <MessageCircle className="h-4 w-4" /> Confirm with our expert
      </a>
      <a href={telLink()} className="btn-outline text-sm"><Phone className="h-4 w-4" /> Call {business.phoneDisplay}</a>
      <div className="sm:col-span-2">
        <LeadForm title="Or leave your number" vehicle_make={vehicle?.make} vehicle_model={vehicle?.model} vehicle_year={vehicle?.year ? String(vehicle.year) : undefined} search_context={{ mode: "vehicle", ...vehicle, source_page: "/tyres" }} />
      </div>
    </div>
  );
}

// suppress unused imports lint if any
void waLink;
