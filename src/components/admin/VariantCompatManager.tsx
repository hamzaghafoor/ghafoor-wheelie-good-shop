import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, Plus } from "lucide-react";
import { listVariantCompat, addVariantCompat, removeCompat } from "@/lib/compatibility.functions";
import { listVehiclesAdmin } from "@/lib/vehicles.functions";

export function VariantCompatManager({ variantId, variantSize }: { variantId: string; variantSize: string }) {
  const qc = useQueryClient();
  const fetchC = useServerFn(listVariantCompat);
  const fetchV = useServerFn(listVehiclesAdmin);
  const add = useServerFn(addVariantCompat);
  const rm = useServerFn(removeCompat);

  const compatQ = useQuery({ queryKey: ["adm-var-compat", variantId], queryFn: () => fetchC({ data: { variant_id: variantId } }) });
  const vehQ = useQuery({ queryKey: ["adm-vehicles"], queryFn: () => fetchV() });

  const [makeId, setMakeId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [yearId, setYearId] = useState<string>("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const makes = vehQ.data?.makes ?? [];
  const allModels = vehQ.data?.models ?? [];
  const query = q.trim().toLowerCase();
  const models = allModels.filter((m: any) => {
    if (query) return m.name.toLowerCase().includes(query) || (makes.find((k: any) => k.id === m.make_id)?.name ?? "").toLowerCase().includes(query);
    if (makeId) return m.make_id === makeId;
    return false;
  });
  const years = (vehQ.data?.years ?? []).filter((y: any) => selected.length === 1 && y.model_id === selected[0]);
  const modelName = (id: string) => allModels.find((m: any) => m.id === id)?.name ?? id;
  const makeName = (id: string) => makes.find((m: any) => m.id === id)?.name ?? "";
  const yearLabel = (id: string | null) => {
    if (!id) return "All years";
    const y = (vehQ.data?.years ?? []).find((r: any) => r.id === id);
    return y ? (y.year_to ? `${y.year_from}–${y.year_to}` : `${y.year_from}+`) : "";
  };

  // Ensure all selected models share the same make (needed for the API which takes one make_id).
  const activeMakeId = selected.length > 0 ? (allModels.find((m: any) => m.id === selected[0])?.make_id ?? makeId) : makeId;

  function toggleModel(m: any) {
    const on = selected.includes(m.id);
    if (on) { setSelected(selected.filter(x => x !== m.id)); setYearId(""); return; }
    // If picking a model from a different make, reset the selection to keep make consistent.
    if (selected.length && allModels.find((x: any) => x.id === selected[0])?.make_id !== m.make_id) {
      setSelected([m.id]);
    } else {
      setSelected([...selected, m.id]);
    }
    setMakeId(m.make_id);
    setYearId("");
  }

  const mAdd = useMutation({
    mutationFn: () => add({ data: {
      variant_id: variantId, make_id: activeMakeId, vehicle_model_ids: selected,
      year_id: yearId || null,
    } }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["adm-var-compat", variantId] }); setSelected([]); setYearId(""); setQ(""); setMsg(`Added ${r.added} vehicle${r.added === 1 ? "" : "s"}.`); },
    onError: (e: any) => setMsg(e.message),
  });
  const mRm = useMutation({
    mutationFn: (id: string) => rm({ data: { id, kind: "variant" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-var-compat", variantId] }),
  });
  const mClear = useMutation({
    mutationFn: async () => {
      const rows = compatQ.data ?? [];
      for (const r of rows as any[]) await rm({ data: { id: r.id, kind: "variant" } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-var-compat", variantId] }),
  });

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg">Vehicle compatibility for {variantSize}</h2>
          <p className="text-xs text-muted-foreground">Only this size shows up when a customer searches for these vehicles.</p>
        </div>
        {(compatQ.data ?? []).length > 0 && (
          <button onClick={() => { if (confirm("Clear all vehicles for this size?")) mClear.mutate(); }}
            className="text-xs text-muted-foreground hover:text-red-600">Clear all</button>
        )}
      </div>

      <div className="mt-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-2.5 text-[11px] text-amber-900">
        Compatibility is <b>guidance only</b>. Always verify the correct size before fitting.
      </div>

      <div className="mt-4 card-surface bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block font-medium">Make</span>
            <select value={makeId} onChange={(e) => { setMakeId(e.target.value); setSelected([]); setYearId(""); }}
              className="h-10 w-full rounded-md border border-border bg-white px-2 text-sm">
              <option value="">Any make</option>
              {makes.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="text-sm"><span className="mb-1 block font-medium">Search model</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Corolla"
              className="h-10 w-full rounded-md border border-border px-3 text-sm" />
          </label>
        </div>

        {(makeId || query) && (
          <div className="mt-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Models {query && !makeId ? `matching "${q}"` : ""} (select one or more)
            </div>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-border bg-surface-2 p-2">
              {models.map((m: any) => {
                const on = selected.includes(m.id);
                return <button key={m.id} type="button" onClick={() => toggleModel(m)}
                  className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-white"}`}>
                  {!makeId && <span className="text-muted-foreground">{makeName(m.make_id)} </span>}{m.name}
                </button>;
              })}
              {models.length === 0 && <span className="text-xs text-muted-foreground">No models match.</span>}
            </div>
            {selected.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Selected: {selected.map(id => `${makeName(allModels.find((m: any) => m.id === id)?.make_id ?? "")} ${modelName(id)}`).join(", ")}
              </div>
            )}
          </div>
        )}


        {selected.length === 1 && years.length > 0 && (
          <label className="mt-3 block text-sm"><span className="mb-1 block font-medium">Year / range (optional)</span>
            <select value={yearId} onChange={(e) => setYearId(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-white px-2 text-sm">
              <option value="">All years</option>
              {years.map((y: any) => <option key={y.id} value={y.id}>{y.year_to ? `${y.year_from}–${y.year_to}` : `${y.year_from}+`}{y.variant_note ? ` · ${y.variant_note}` : ""}</option>)}
            </select>
          </label>
        )}

        <button disabled={!makeId || selected.length === 0 || mAdd.isPending} onClick={() => mAdd.mutate()}
          className="btn-primary mt-4 text-sm disabled:opacity-50">
          <Plus className="h-4 w-4" /> {mAdd.isPending ? "Adding…" : `Add ${selected.length || ""} vehicle${selected.length === 1 ? "" : "s"}`}
        </button>
        {msg && <div className="mt-2 text-xs text-muted-foreground">{msg}</div>}
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned vehicles</div>
        {compatQ.isLoading ? <div className="mt-2 text-sm text-muted-foreground">Loading…</div> :
         (compatQ.data ?? []).length === 0 ? <div className="mt-2 text-sm text-muted-foreground">No vehicles assigned to this size yet.</div> : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(compatQ.data as any[]).map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs">
                {makeName(c.make_id)} {modelName(c.model_id)} <span className="text-muted-foreground">· {yearLabel(c.year_id)}</span>
                <button onClick={() => mRm.mutate(c.id)} className="text-muted-foreground hover:text-red-600"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
