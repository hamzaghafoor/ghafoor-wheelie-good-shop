import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Search as SearchIcon } from "lucide-react";
import { searchCatalogue } from "@/lib/search.functions";

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
  validateSearch: (s) => z.object({ q: z.string().optional(), category: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Search — Ghafoor Motors" }, { name: "description", content: "Search tyres, lubricants and parts by name, brand, size, viscosity or part number." }] }),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(params.q ?? "");
  const [cat, setCat] = useState(params.category ?? "");

  const search = useServerFn(searchCatalogue);
  const { data, isFetching } = useQuery({
    queryKey: ["search", params.q, params.category],
    queryFn: () => search({ data: { q: params.q!, category: params.category || null } }),
    enabled: !!params.q && params.q.length > 1,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: { q: q.trim() || undefined, category: cat || undefined } });
  };

  const results = data ?? [];

  return (
    <>
      <section className="bg-ink py-14 text-white">
        <div className="container-x">
          <p className="eyebrow text-primary">Search</p>
          <h1 className="mt-3 font-display text-3xl md:text-4xl">Find tyres, lubricants and parts</h1>
          <form onSubmit={submit} className="mt-6 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. 195/65 R15, Toyota Corolla, 5W-30, oil filter" className="h-12 w-full rounded-full border border-white/20 bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none" />
            </div>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-12 rounded-full border border-white/20 bg-white/10 px-4 text-sm text-white">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value} className="text-ink">{c.label}</option>)}
            </select>
            <button className="btn-primary text-sm">Search</button>
          </form>
        </div>
      </section>

      <section className="py-10">
        <div className="container-x">
          {!params.q ? (
            <p className="text-sm text-muted-foreground">Type something above to search across the catalogue.</p>
          ) : isFetching ? (
            <p className="text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <div className="card-surface p-8 text-center">
              <h3 className="font-display text-xl">No results for "{params.q}"</h3>
              <p className="mt-2 text-sm text-muted-foreground">Try a different keyword, brand, tyre size (e.g. 195/65 R15), viscosity (e.g. 5W-30) or part number — or contact us on WhatsApp.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">{results.length} result{results.length === 1 ? "" : "s"}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((r: any) => <ResultCard key={`${r.kind}-${r.id}`} r={r} />)}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function ResultCard({ r }: { r: any }) {
  const href = r.kind === "tyre" ? "/tyres" : categoryHref(r.category);
  const img = r.images?.main?.url || null;
  return (
    <Link to={href} className="card-surface group overflow-hidden">
      <div className="aspect-[4/3] overflow-hidden bg-surface-2">
        {img ? <img src={img} alt={r.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{r.category}</div>}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
          <span className="text-primary">{r.brand_name ?? "—"}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{r.kind === "tyre" ? "Tyre" : r.category.replace(/_/g, " ")}</span>
        </div>
        <h3 className="mt-1 font-display text-lg text-ink line-clamp-2">{r.title}</h3>
        {r.size_or_spec && <p className="mt-1 text-xs text-muted-foreground">{r.size_or_spec}</p>}
        {r.part_number && <p className="text-xs text-muted-foreground">P/N: {r.part_number}</p>}
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
