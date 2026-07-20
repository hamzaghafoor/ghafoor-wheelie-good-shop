import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listCatalogueReviewQueue } from "@/lib/catalogue-import.functions";

export const Route = createFileRoute("/_authenticated/admin/catalogue/review")({
  head: () => ({ meta: [{ title: "Catalogue Review Queue | GMTL Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ReviewPage,
});

const CATEGORIES = ["", "tyres", "lubricants", "filters", "maintenance_parts", "car_care", "additives", "accessories", "services"];

function ReviewPage() {
  const listFn = useServerFn(listCatalogueReviewQueue);
  const q = useQuery({ queryKey: ["cat-review"], queryFn: () => listFn() });
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [missing, setMissing] = useState<"any" | "pack" | "type">("any");

  const filtered = useMemo(() => {
    let out = (q.data ?? []) as any[];
    if (category) out = out.filter((p) => p.category === category);
    if (search.trim()) {
      const s = search.toLowerCase();
      out = out.filter((p) => p.name?.toLowerCase().includes(s) || p.erp_description?.toLowerCase().includes(s));
    }
    if (missing === "pack") out = out.filter((p) => !p.product_variants?.length || p.product_variants.every((v: any) => !v.pack_label));
    if (missing === "type") out = out.filter((p) => !p.product_type_id);
    return out;
  }, [q.data, category, search, missing]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Catalogue review queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Draft products imported from ERP. Review, correct and publish through the normal product editor.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/catalogue/import" className="btn-outline text-sm">Back to imports</Link>
          <Link to="/admin/catalogue" className="btn-outline text-sm">Catalogue</Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 rounded border border-border px-2">
          {CATEGORIES.map(c => <option key={c} value={c}>{c || "All categories"}</option>)}
        </select>
        <select value={missing} onChange={(e) => setMissing(e.target.value as any)} className="h-8 rounded border border-border px-2">
          <option value="any">All rows</option>
          <option value="pack">Missing pack info</option>
          <option value="type">Missing product type</option>
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or ERP description…" className="h-8 flex-1 min-w-[220px] rounded border border-border px-2" />
        <div className="text-muted-foreground">{filtered.length} draft{filtered.length === 1 ? "" : "s"}</div>
      </div>

      <div className="card-surface mt-3 overflow-hidden bg-white">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Brand</th>
              <th className="p-2 text-left">Variants</th>
              <th className="p-2 text-left">Imported</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p: any) => (
              <tr key={p.id} className="border-t border-border align-top">
                <td className="p-2">
                  <div className="font-medium">{p.name}</div>
                  {p.erp_description && <div className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">ERP: {p.erp_description}</div>}
                </td>
                <td className="p-2">{p.category}</td>
                <td className="p-2">{p.brands?.name ?? "—"}</td>
                <td className="p-2">
                  {(p.product_variants ?? []).length === 0
                    ? <span className="text-red-700">no variants</span>
                    : (p.product_variants ?? []).map((v: any) => (
                        <div key={v.id} className="text-[11px]">
                          {v.pack_label ?? "—"}
                          {v.erp_stock_id && <span className="ml-1 font-mono text-[10px] text-muted-foreground">({v.erp_stock_id})</span>}
                        </div>
                      ))}
                </td>
                <td className="p-2 text-[10px]">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="p-2 text-right">
                  <Link to="/admin/catalogue/$id" params={{ id: p.id }} className="text-primary hover:underline">Open in editor →</Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No draft imports match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
