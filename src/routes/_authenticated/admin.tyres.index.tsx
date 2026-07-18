import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listCatalogueAdmin, priceStillCorrect, setVariantStatus, quickUpdatePrice, quickUpdateAvailability } from "@/lib/catalogue.functions";
import { AVAILABILITY_STATUSES, PRICE_MODES } from "@/lib/tyre-sizes";
import { Pencil, MoreHorizontal, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tyres/")({
  component: TyresList,
});

function TyresList() {
  const list = useServerFn(listCatalogueAdmin);
  const q = useQuery({ queryKey: ["adm-cat"], queryFn: () => list() });
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "archived">("all");

  const grouped = useMemo(() => {
    if (!q.data) return [];
    const brands = q.data.brands;
    const models = q.data.models;
    const variants = q.data.variants;
    const byModel = new Map<string, any[]>();
    for (const v of variants) {
      if (filter !== "all" && v.status !== filter) continue;
      if (!byModel.has(v.model_id)) byModel.set(v.model_id, []);
      byModel.get(v.model_id)!.push(v);
    }
    const byBrand = new Map<string, any>();
    for (const b of brands) byBrand.set(b.id, { brand: b, models: [] });
    for (const m of models) {
      const b = byBrand.get(m.brand_id); if (!b) continue;
      const vs = byModel.get(m.id) ?? [];
      if (filter !== "all" && vs.length === 0) continue;
      b.models.push({ ...m, variants: vs });
    }
    return Array.from(byBrand.values()).filter((x) => x.models.length > 0);
  }, [q.data, filter]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Tyres</h1>
          <p className="mt-1 text-sm text-muted-foreground">Brand → Model → Size. Only published tyres appear publicly.</p>
        </div>
        <Link to="/admin/tyres/new" className="btn-primary text-sm">+ Add tyre</Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["all","published","draft","archived"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${filter === f ? "bg-ink text-white" : "bg-white border border-border text-foreground/70"}`}>{f}</button>
        ))}
      </div>

      {q.isLoading ? <div className="mt-6 text-sm text-muted-foreground">Loading…</div> : grouped.length === 0 ? (
        <div className="card-surface mt-6 bg-white p-8 text-center text-sm text-muted-foreground">
          No tyres yet. <Link to="/admin/tyres/new" className="text-primary font-semibold">Add your first tyre</Link>.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {grouped.map((g) => (
            <div key={g.brand.id} className="card-surface bg-white overflow-hidden">
              <div className="border-b border-border bg-muted/40 px-4 py-2 font-display text-sm">{g.brand.name}</div>
              {g.models.map((m: any) => (
                <div key={m.id} className="border-b border-border last:border-0">
                  <div className="flex items-center justify-between px-4 py-2">
                    <div>
                      <div className="font-semibold text-sm">{m.name} <StatusBadge status={m.status} /></div>
                      {m.short_desc && <div className="text-xs text-muted-foreground">{m.short_desc}</div>}
                    </div>
                  </div>
                  {m.variants.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <tr><th className="p-2 text-left">Size</th><th className="p-2 text-left">Price</th><th className="p-2 text-left">Availability</th><th className="p-2">Freshness</th><th className="p-2">Status</th><th className="p-2 text-right">Actions</th></tr>
                        </thead>
                        <tbody>
                          {m.variants.map((v: any) => <VariantRow key={v.id} v={v} />)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "published" ? "bg-green-100 text-green-700" : status === "archived" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700";
  return <span className={`ml-2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${color}`}>{status}</span>;
}

function VariantRow({ v }: { v: any }) {
  const qc = useQueryClient();
  const setStatus = useServerFn(setVariantStatus);
  const priceOk = useServerFn(priceStillCorrect);
  const setPrice = useServerFn(quickUpdatePrice);
  const setAvail = useServerFn(quickUpdateAvailability);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["adm-cat"] });
  const [open, setOpen] = useState(false);

  const stat = useMutation({ mutationFn: (status: any) => setStatus({ data: { id: v.id, status } }), onSuccess: invalidate });
  const ok = useMutation({ mutationFn: () => priceOk({ data: { id: v.id } }), onSuccess: invalidate });
  const price = useMutation({ mutationFn: (d: any) => setPrice({ data: { id: v.id, ...d } }), onSuccess: () => { invalidate(); setOpen(false); } });
  const avail = useMutation({ mutationFn: (av: string) => setAvail({ data: { id: v.id, availability: av as any } }), onSuccess: invalidate });

  const daysSince = (t: string | null) => t ? Math.floor((Date.now() - new Date(t).getTime()) / 86400000) : null;
  const priceAge = daysSince(v.price_verified_at);
  const freshness = priceAge == null ? "—" : priceAge <= 7 ? "Current" : priceAge <= 14 ? "Review" : "Outdated";

  return (
    <>
    <tr className="border-t border-border">
      <td className="p-2 font-medium">{v.normalized_size}</td>
      <td className="p-2">
        {v.price_mode === "hidden" ? <span className="text-muted-foreground text-xs">Hidden</span> :
         v.price_mode === "on_request" ? <span className="text-xs text-muted-foreground">On request</span> :
         v.price != null ? <>PKR {Number(v.price).toLocaleString()}{v.price_mode === "starting_from" && <span className="text-xs text-muted-foreground"> from</span>}</> :
         <span className="text-muted-foreground text-xs">—</span>}
      </td>
      <td className="p-2 text-xs">
        <select value={v.availability} onChange={(e) => avail.mutate(e.target.value)} className="rounded border border-border bg-white px-1.5 py-0.5 text-xs">
          {AVAILABILITY_STATUSES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </td>
      <td className="p-2 text-center text-xs">
        <span className={`rounded px-1.5 py-0.5 ${freshness === "Current" ? "bg-green-100 text-green-700" : freshness === "Review" ? "bg-amber-100 text-amber-700" : freshness === "Outdated" ? "bg-red-100 text-red-700" : "text-muted-foreground"}`}>{freshness}</span>
      </td>
      <td className="p-2 text-center"><StatusBadge status={v.status} /></td>
      <td className="p-2">
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => ok.mutate()} title="Price still correct" className="rounded p-1 hover:bg-muted"><Check className="h-4 w-4" /></button>
          <button onClick={() => setOpen(!open)} title="Update price" className="rounded p-1 hover:bg-muted text-xs">₨</button>
          {v.status !== "published" ? (
            <button onClick={() => stat.mutate("published")} className="rounded bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white">Publish</button>
          ) : (
            <button onClick={() => stat.mutate("draft")} className="rounded border border-border px-2 py-0.5 text-[10px] font-semibold">Unpublish</button>
          )}
          <Link to="/admin/tyres/$id" params={{ id: v.id }} className="rounded p-1 hover:bg-muted"><Pencil className="h-4 w-4" /></Link>
          <button onClick={() => stat.mutate(v.status === "archived" ? "draft" : "archived")} className="rounded p-1 hover:bg-muted" title="Archive"><MoreHorizontal className="h-4 w-4" /></button>
        </div>
      </td>
    </tr>
    {open && (
      <tr className="border-t border-border bg-muted/20">
        <td colSpan={6} className="p-3">
          <QuickPriceForm v={v} onSave={(d) => price.mutate(d)} busy={price.isPending} />
        </td>
      </tr>
    )}
    </>
  );
}

function QuickPriceForm({ v, onSave, busy }: { v: any; onSave: (d: any) => void; busy: boolean }) {
  const [mode, setMode] = useState(v.price_mode);
  const [priceVal, setPriceVal] = useState<string>(v.price != null ? String(v.price) : "");
  const [note, setNote] = useState(v.price_note ?? "");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs">Mode<br/><select value={mode} onChange={(e) => setMode(e.target.value as any)} className="h-8 rounded border border-border bg-white px-2 text-xs">{PRICE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
      <label className="text-xs">Price (PKR)<br/><input value={priceVal} onChange={(e) => setPriceVal(e.target.value)} type="number" className="h-8 w-32 rounded border border-border bg-white px-2 text-xs" /></label>
      <label className="text-xs flex-1 min-w-[160px]">Note<br/><input value={note} onChange={(e) => setNote(e.target.value)} className="h-8 w-full rounded border border-border bg-white px-2 text-xs" /></label>
      <button disabled={busy} onClick={() => onSave({ price_mode: mode, price: priceVal ? Number(priceVal) : null, price_note: note || null })} className="btn-primary h-8 text-xs">{busy ? "Saving…" : "Save price"}</button>
    </div>
  );
}
