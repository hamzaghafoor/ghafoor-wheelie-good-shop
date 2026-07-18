import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listModelCompat, addModelCompat, removeCompat } from "@/lib/compatibility.functions";
import { listVehiclesAdmin } from "@/lib/vehicles.functions";
import { getModelAdmin } from "@/lib/catalogue.functions";
import { X, Plus, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tyres/$id/compat")({
  component: CompatPage,
});

function CompatPage() {
  const { id } = useParams({ from: "/_authenticated/admin/tyres/$id/compat" });
  const qc = useQueryClient();
  const fetchM = useServerFn(getModelAdmin);
  const fetchC = useServerFn(listModelCompat);
  const fetchV = useServerFn(listVehiclesAdmin);
  const add = useServerFn(addModelCompat);
  const rm = useServerFn(removeCompat);

  const modelQ = useQuery({ queryKey: ["adm-model", id], queryFn: () => fetchM({ data: { id } }) });
  const compatQ = useQuery({ queryKey: ["adm-compat", id], queryFn: () => fetchC({ data: { model_id: id } }) });
  const vehQ = useQuery({ queryKey: ["adm-vehicles"], queryFn: () => fetchV() });

  const [makeId, setMakeId] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const models = (vehQ.data?.models ?? []).filter((m: any) => !makeId || m.make_id === makeId);
  const makes = vehQ.data?.makes ?? [];
  const modelName = (mid: string) => (vehQ.data?.models ?? []).find((m: any) => m.id === mid)?.name ?? mid;
  const makeName = (mid: string) => (vehQ.data?.models ?? []).find((m: any) => m.id === mid)?.make_id
    ? makes.find((k: any) => k.id === (vehQ.data?.models ?? []).find((m: any) => m.id === mid)?.make_id)?.name : "";

  const mAdd = useMutation({
    mutationFn: () => add({ data: { tyre_model_id: id, entries: selectedModels.map(vm => ({
      vehicle_model_id: vm,
      year_from: yearFrom ? Number(yearFrom) : null,
      year_to: yearTo ? Number(yearTo) : null,
    })) } }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["adm-compat", id] }); setSelectedModels([]); setMsg(`Added ${r.added} compatibility entries.`); },
    onError: (e: any) => setMsg(e.message),
  });

  const mRm = useMutation({
    mutationFn: (rid: string) => rm({ data: { id: rid, kind: "model" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-compat", id] }),
  });

  return (
    <div className="max-w-3xl">
      <Link to="/admin/tyres" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink"><ChevronLeft className="h-4 w-4" /> Back to tyres</Link>
      <h1 className="mt-2 font-display text-2xl">Vehicle Compatibility</h1>
      <p className="text-sm text-muted-foreground">{modelQ.data?.model?.name ?? "…"}</p>

      <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3 text-xs text-amber-900">
        Compatibility here is <b>guidance only</b>. Always verify the correct size before fitting. Simply matching rim diameter does not mean a tyre fits.
      </div>

      <div className="mt-6 card-surface bg-white p-5">
        <h2 className="font-display text-lg">Add compatibility</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block font-medium">Make</span>
            <select value={makeId} onChange={(e) => { setMakeId(e.target.value); setSelectedModels([]); }} className="h-10 w-full rounded-md border border-border bg-white px-2 text-sm">
              <option value="">Select make…</option>
              {makes.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm"><span className="mb-1 block font-medium">Year from</span>
              <input type="number" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className="h-10 w-full rounded-md border border-border px-2 text-sm" placeholder="Any" />
            </label>
            <label className="text-sm"><span className="mb-1 block font-medium">Year to</span>
              <input type="number" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className="h-10 w-full rounded-md border border-border px-2 text-sm" placeholder="Any" />
            </label>
          </div>
        </div>
        {makeId && (
          <div className="mt-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Select one or more models</div>
            <div className="flex flex-wrap gap-1.5">
              {models.map((m: any) => {
                const on = selectedModels.includes(m.id);
                return <button key={m.id} type="button" onClick={() => setSelectedModels(on ? selectedModels.filter(x => x !== m.id) : [...selectedModels, m.id])}
                  className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{m.name}</button>;
              })}
              {models.length === 0 && <span className="text-xs text-muted-foreground">No models yet for this make.</span>}
            </div>
          </div>
        )}
        <button disabled={selectedModels.length === 0 || mAdd.isPending} onClick={() => mAdd.mutate()} className="btn-primary mt-4 text-sm disabled:opacity-50">
          <Plus className="h-4 w-4" /> {mAdd.isPending ? "Adding…" : `Add ${selectedModels.length || ""} vehicles`}
        </button>
        {msg && <div className="mt-2 text-xs text-muted-foreground">{msg}</div>}
      </div>

      <div className="mt-6">
        <h2 className="font-display text-lg">Assigned vehicles</h2>
        {compatQ.isLoading ? <div className="mt-2 text-sm text-muted-foreground">Loading…</div> :
         (compatQ.data ?? []).length === 0 ? <div className="mt-2 text-sm text-muted-foreground">No vehicles assigned yet.</div> : (
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-white">
            {(compatQ.data ?? []).map((c: any) => (
              <li key={c.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="font-medium">{makeName(c.vehicle_model_id)} {modelName(c.vehicle_model_id)}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.year_from || c.year_to ? `${c.year_from ?? "any"}–${c.year_to ?? "any"}` : "All years"}
                  </div>
                </div>
                <button onClick={() => mRm.mutate(c.id)} className="text-muted-foreground hover:text-red-600"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
