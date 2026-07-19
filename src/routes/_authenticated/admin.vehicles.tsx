import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listVehiclesAdmin, upsertMake, upsertVehicleModel, upsertVehicleYear, archiveVehicle } from "@/lib/vehicles.functions";
import { ChevronDown, ChevronRight, Plus, Archive, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/vehicles")({
  component: VehiclesAdmin,
});

const inp = "h-9 rounded border border-border bg-white px-2 text-sm";
const BODY_TYPES = ["hatchback","sedan","suv","crossover","pickup","van","commercial","motorcycle","other"] as const;

function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function VehiclesAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listVehiclesAdmin);
  const saveMake = useServerFn(upsertMake);
  const saveModel = useServerFn(upsertVehicleModel);
  const saveYear = useServerFn(upsertVehicleYear);
  const arch = useServerFn(archiveVehicle);
  const q = useQuery({ queryKey: ["adm-vehicles"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["adm-vehicles"] });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showMake, setShowMake] = useState(false);
  const [modelFor, setModelFor] = useState<string | null>(null);
  const [yearFor, setYearFor] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const modelsByMake = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const md of q.data?.models ?? []) {
      if (!m.has(md.make_id)) m.set(md.make_id, []);
      m.get(md.make_id)!.push(md);
    }
    return m;
  }, [q.data]);

  const yearsByModel = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const y of q.data?.years ?? []) {
      if (!m.has(y.model_id)) m.set(y.model_id, []);
      m.get(y.model_id)!.push(y);
    }
    return m;
  }, [q.data]);

  const mSave = useMutation({ mutationFn: (d: any) => saveMake({ data: d }), onSuccess: () => { setShowMake(false); setMsg("Saved."); invalidate(); }, onError: (e: any) => setMsg(e.message) });
  const mdSave = useMutation({ mutationFn: (d: any) => saveModel({ data: d }), onSuccess: () => { setModelFor(null); setMsg("Saved."); invalidate(); }, onError: (e: any) => setMsg(e.message) });
  const ySave = useMutation({ mutationFn: (d: any) => saveYear({ data: d }), onSuccess: () => { setYearFor(null); setMsg("Saved."); invalidate(); }, onError: (e: any) => setMsg(e.message) });
  const mArch = useMutation({ mutationFn: (d: any) => arch({ data: d }), onSuccess: invalidate });

  const toggle = (id: string) => { const n = new Set(expanded); n.has(id) ? n.delete(id) : n.add(id); setExpanded(n); };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Vehicles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Makes → Models → Years. Reused across tyres and all product categories.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/vehicles/review" className="btn-outline text-sm">Review queue</Link>
          <Link to="/admin/vehicles/import" className="btn-outline text-sm">Import Vehicle Data</Link>
          <button onClick={() => setShowMake(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Add make</button>
        </div>
      </div>

      {msg && <div className="mt-3 rounded-md bg-green-50 p-2 text-xs text-green-800">{msg}</div>}

      {q.isLoading ? <div className="mt-6 text-sm text-muted-foreground">Loading…</div> : (q.data?.makes.length ?? 0) === 0 ? (
        <div className="card-surface mt-6 bg-white p-8 text-center text-sm text-muted-foreground">No vehicles yet. Add your first make.</div>
      ) : (
        <div className="mt-6 space-y-2">
          {(q.data?.makes ?? []).map((mk: any) => {
            const models = modelsByMake.get(mk.id) ?? [];
            const open = expanded.has(mk.id);
            return (
              <div key={mk.id} className={`card-surface bg-white ${mk.archived ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-2 p-3">
                  <button onClick={() => toggle(mk.id)} className="rounded p-1 hover:bg-muted">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{mk.name} <span className="ml-1 text-[10px] text-muted-foreground">/{mk.slug}</span></div>
                    <div className="text-xs text-muted-foreground">{models.length} model{models.length === 1 ? "" : "s"}</div>
                  </div>
                  <button onClick={() => setModelFor(mk.id)} className="btn-outline text-xs"><Plus className="h-3.5 w-3.5" /> Model</button>
                  <button onClick={() => mArch.mutate({ kind: "make", id: mk.id, archived: !mk.archived })} className="rounded p-1.5 hover:bg-muted" title={mk.archived ? "Restore" : "Archive"}>
                    {mk.archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  </button>
                </div>
                {open && (
                  <div className="border-t border-border bg-muted/20 px-4 py-2">
                    {models.length === 0 ? <div className="p-2 text-xs text-muted-foreground">No models yet.</div> : (
                      <table className="w-full text-sm">
                        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          <tr><th className="py-1 text-left">Model</th><th className="py-1 text-left">Body</th><th className="py-1 text-left">Years</th><th className="py-1"></th></tr>
                        </thead>
                        <tbody>
                          {models.map((md: any) => {
                            const yrs = yearsByModel.get(md.id) ?? [];
                            return (
                              <tr key={md.id} className={`border-t border-border ${md.archived ? "opacity-60" : ""}`}>
                                <td className="py-1.5">{md.name} {md.is_popular && <span className="ml-1 text-[9px] uppercase text-amber-700">Popular</span>}</td>
                                <td className="py-1.5 text-xs text-muted-foreground">{md.body_type}</td>
                                <td className="py-1.5 text-xs">{yrs.length === 0 ? <span className="text-muted-foreground">—</span> : yrs.map((y) => `${y.year_from}${y.year_to ? "–" + y.year_to : "+"}${y.variant_note ? " (" + y.variant_note + ")" : ""}`).join(", ")}</td>
                                <td className="py-1.5 text-right">
                                  <Link to="/admin/vehicles/$modelId" params={{ modelId: md.id }} className="mr-2 text-[10px] text-primary hover:underline">Configs</Link>
                                  <button onClick={() => setYearFor(md.id)} className="btn-outline text-[10px]"><Plus className="h-3 w-3" /> Year</button>
                                  <button onClick={() => mArch.mutate({ kind: "model", id: md.id, archived: !md.archived })} className="ml-1 rounded p-1 hover:bg-muted" title={md.archived ? "Restore" : "Archive"}>
                                    {md.archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showMake && <MakeForm onCancel={() => setShowMake(false)} onSave={(d: any) => mSave.mutate(d)} busy={mSave.isPending} />}
      {modelFor && <ModelForm makeId={modelFor} onCancel={() => setModelFor(null)} onSave={(d: any) => mdSave.mutate(d)} busy={mdSave.isPending} />}
      {yearFor && <YearForm modelId={yearFor} onCancel={() => setYearFor(null)} onSave={(d: any) => ySave.mutate(d)} busy={ySave.isPending} />}
    </div>
  );
}

function Modal({ title, children, onCancel }: any) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="font-display text-lg">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function MakeForm({ onCancel, onSave, busy }: any) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  return (
    <Modal title="New make" onCancel={onCancel}>
      <div className="space-y-3">
        <label className="block text-sm">Name<input autoFocus value={name} onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)); }} className={`${inp} w-full mt-1`} /></label>
        <label className="block text-sm">Slug<input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className={`${inp} w-full mt-1`} /></label>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="text-xs text-muted-foreground">Cancel</button>
          <button disabled={busy || !name || !slug} onClick={() => onSave({ name, slug })} className="btn-primary text-sm">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Modal>
  );
}

function ModelForm({ makeId, onCancel, onSave, busy }: any) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState<(typeof BODY_TYPES)[number]>("sedan");
  const [popular, setPopular] = useState(false);
  return (
    <Modal title="New model" onCancel={onCancel}>
      <div className="space-y-3">
        <label className="block text-sm">Name<input autoFocus value={name} onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)); }} className={`${inp} w-full mt-1`} /></label>
        <label className="block text-sm">Slug<input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className={`${inp} w-full mt-1`} /></label>
        <label className="block text-sm">Body type<select value={body} onChange={(e) => setBody(e.target.value as any)} className={`${inp} w-full mt-1`}>{BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={popular} onChange={(e) => setPopular(e.target.checked)} /> Mark as popular in Karachi</label>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="text-xs text-muted-foreground">Cancel</button>
          <button disabled={busy || !name || !slug} onClick={() => onSave({ make_id: makeId, name, slug, body_type: body, is_popular: popular })} className="btn-primary text-sm">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Modal>
  );
}

function YearForm({ modelId, onCancel, onSave, busy }: any) {
  const now = new Date().getFullYear();
  const [from, setFrom] = useState<number>(now - 5);
  const [to, setTo] = useState<string>("");
  const [note, setNote] = useState("");
  return (
    <Modal title="New year range" onCancel={onCancel}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Year from<input type="number" min={1950} max={2100} value={from} onChange={(e) => setFrom(Number(e.target.value))} className={`${inp} w-full mt-1`} /></label>
          <label className="block text-sm">Year to (optional)<input type="number" min={1950} max={2100} value={to} onChange={(e) => setTo(e.target.value)} className={`${inp} w-full mt-1`} /></label>
        </div>
        <label className="block text-sm">Variant note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. GLi / 1.3 / Grande" className={`${inp} w-full mt-1`} /></label>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="text-xs text-muted-foreground">Cancel</button>
          <button disabled={busy} onClick={() => onSave({ model_id: modelId, year_from: from, year_to: to ? Number(to) : null, variant_note: note || null })} className="btn-primary text-sm">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Modal>
  );
}
