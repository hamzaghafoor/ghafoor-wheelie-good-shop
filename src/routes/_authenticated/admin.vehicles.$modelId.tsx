import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { getModelWithConfigs, upsertConfiguration, archiveOemRecord } from "@/lib/oem.functions";
import { Plus, Archive, RotateCcw, ExternalLink, ChevronLeft, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/vehicles/$modelId")({
  component: ModelConfigsPage,
});

const inp = "h-9 rounded border border-border bg-white px-2 text-sm w-full";
const lbl = "block text-xs font-medium text-muted-foreground mb-1";

const FUEL = ["petrol","diesel","hybrid","phev","ev","cng","lpg"] as const;
const MARKET = ["PK","GLOBAL","JP_IMPORT","OTHER_IMPORT"] as const;
const SOURCE = ["manufacturer","owner_manual","official_dealer","trusted_publication","community","other"] as const;
const STATUS = ["needs_verification","partial","verified","disputed"] as const;

function statusBadge(s: string, archived?: boolean) {
  if (archived) return { label: "Archived", cls: "bg-gray-200 text-gray-700" };
  switch (s) {
    case "verified": return { label: "Verified", cls: "bg-green-100 text-green-800" };
    case "partial": return { label: "Partial", cls: "bg-amber-100 text-amber-800" };
    case "disputed": return { label: "Disputed", cls: "bg-red-100 text-red-800" };
    default: return { label: "Draft", cls: "bg-slate-100 text-slate-700" };
  }
}

function ModelConfigsPage() {
  const { modelId } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getModelWithConfigs);
  const save = useServerFn(upsertConfiguration);
  const arch = useServerFn(archiveOemRecord);
  const q = useQuery({ queryKey: ["adm-cfgs", modelId], queryFn: () => load({ data: { modelId } }) });
  const [editing, setEditing] = useState<any | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const mSave = useMutation({
    mutationFn: (d: any) => save({ data: d }),
    onSuccess: () => { setEditing(null); setMsg("Saved."); qc.invalidateQueries({ queryKey: ["adm-cfgs", modelId] }); },
    onError: (e: any) => setMsg(e.message),
  });
  const mArch = useMutation({
    mutationFn: (d: any) => arch({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-cfgs", modelId] }),
  });

  const filtered = useMemo(() => {
    const rows = (q.data?.configs ?? []).filter((r: any) => showArchived || !r.archived);
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r: any) =>
      [r.trim_name, r.engine_code, r.engine_name, r.chassis_code, r.market].some((f) => (f ?? "").toLowerCase().includes(s))
    );
  }, [q.data, showArchived, search]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/vehicles" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3 w-3" /> Back to vehicles
          </Link>
          <h1 className="mt-1 font-display text-2xl">
            {q.data?.make?.name ?? ""} {q.data?.model?.name ?? "…"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">OEM configurations, tyre and engine-oil specifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
          </label>
          <button onClick={() => setEditing({ model_id: modelId, market: "PK", verification_status: "needs_verification" })} className="btn-primary text-sm">
            <Plus className="h-4 w-4" /> Add configuration
          </button>
        </div>
      </div>

      {msg && <div className="mt-3 rounded-md bg-green-50 p-2 text-xs text-green-800">{msg}</div>}

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search trim, engine code, chassis…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded border border-border bg-white pl-8 pr-2 text-sm" />
        </div>
      </div>

      {q.isLoading ? <div className="mt-6 text-sm text-muted-foreground">Loading…</div> : filtered.length === 0 ? (
        <div className="card-surface mt-6 bg-white p-8 text-center text-sm text-muted-foreground">
          {(q.data?.configs?.length ?? 0) === 0 ? "No configurations yet. Add the first one." : "No matches."}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto card-surface bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Trim</th>
                <th className="p-2 text-left">Engine</th>
                <th className="p-2 text-left">Market</th>
                <th className="p-2 text-left">Years</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const b = statusBadge(c.verification_status, c.archived);
                return (
                  <tr key={c.id} className={`border-t border-border ${c.archived ? "opacity-60" : ""}`}>
                    <td className="p-2 font-medium">{c.trim_name || <span className="text-muted-foreground">(no trim)</span>}</td>
                    <td className="p-2 text-xs text-muted-foreground">{[c.engine_code, c.engine_capacity_cc && `${c.engine_capacity_cc}cc`, c.fuel_type].filter(Boolean).join(" · ")}</td>
                    <td className="p-2 text-xs">{c.market}</td>
                    <td className="p-2 text-xs">{c.pk_year_from ? `${c.pk_year_from}${c.pk_year_to ? "–" + c.pk_year_to : "+"}` : c.production_year_from ? `${c.production_year_from}${c.production_year_to ? "–" + c.production_year_to : "+"}` : "—"}</td>
                    <td className="p-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${b.cls}`}>{b.label}</span></td>
                    <td className="p-2 text-right">
                      <Link to="/admin/vehicles/configurations/$configId" params={{ configId: c.id }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        Specs <ExternalLink className="h-3 w-3" />
                      </Link>
                      <button onClick={() => setEditing(c)} className="ml-3 text-xs text-primary hover:underline">Edit</button>
                      <button onClick={() => mArch.mutate({ kind: "config", id: c.id, archived: !c.archived })} className="ml-2 rounded p-1 hover:bg-muted" title={c.archived ? "Restore" : "Archive"}>
                        {c.archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ConfigForm initial={editing} busy={mSave.isPending} onCancel={() => setEditing(null)} onSave={(d: any) => mSave.mutate(d)} />}
    </div>
  );
}

function ConfigForm({ initial, onCancel, onSave, busy }: any) {
  const [f, setF] = useState<any>({ ...initial });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  const wantVerified = f.verification_status === "verified";
  const missing: string[] = [];
  if (wantVerified) {
    if (!f.trim_name?.trim()) missing.push("Trim name");
    if (!f.fuel_type) missing.push("Fuel type");
    if (!f.production_year_from) missing.push("Production year from");
    if (!["manufacturer","owner_manual","official_dealer"].includes(f.source_type)) missing.push("Reliable source (manufacturer / owner manual / official dealer)");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="font-display text-lg">{f.id ? "Edit configuration" : "New configuration"}</h3>
        <p className="mt-1 text-xs text-muted-foreground">All fields optional. Fields marked with * are required only when marking as <b>Verified</b>.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><label className={lbl}>Trim name *</label><input value={f.trim_name ?? ""} onChange={(e) => set("trim_name", e.target.value)} placeholder="GLi, Altis Grande…" className={inp} /></div>
          <div><label className={lbl}>Engine code</label><input value={f.engine_code ?? ""} onChange={(e) => set("engine_code", e.target.value)} placeholder="1NR-FE" className={inp} /></div>
          <div><label className={lbl}>Engine name</label><input value={f.engine_name ?? ""} onChange={(e) => set("engine_name", e.target.value)} placeholder="1.3 VVT-i" className={inp} /></div>
          <div><label className={lbl}>Chassis code</label><input value={f.chassis_code ?? ""} onChange={(e) => set("chassis_code", e.target.value)} placeholder="E210, ZRE172…" className={inp} /></div>
          <div><label className={lbl}>Engine capacity (cc)</label><input type="number" value={f.engine_capacity_cc ?? ""} onChange={(e) => set("engine_capacity_cc", numOrNull(e.target.value))} className={inp} /></div>
          <div><label className={lbl}>Fuel type *</label>
            <select value={f.fuel_type ?? ""} onChange={(e) => set("fuel_type", e.target.value || null)} className={inp}>
              <option value="">—</option>{FUEL.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Transmission</label><input value={f.transmission ?? ""} onChange={(e) => set("transmission", e.target.value)} placeholder="CVT, 6MT…" className={inp} /></div>
          <div><label className={lbl}>Drivetrain</label><input value={f.drivetrain ?? ""} onChange={(e) => set("drivetrain", e.target.value)} placeholder="FWD, AWD…" className={inp} /></div>
          <div><label className={lbl}>Body type</label><input value={f.body_type ?? ""} onChange={(e) => set("body_type", e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Market</label>
            <select value={f.market ?? "PK"} onChange={(e) => set("market", e.target.value)} className={inp}>
              {MARKET.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Production year from *</label><input type="number" value={f.production_year_from ?? ""} onChange={(e) => set("production_year_from", numOrNull(e.target.value))} className={inp} /></div>
          <div><label className={lbl}>Production year to</label><input type="number" value={f.production_year_to ?? ""} onChange={(e) => set("production_year_to", numOrNull(e.target.value))} className={inp} /></div>
          <div><label className={lbl}>PK year from</label><input type="number" value={f.pk_year_from ?? ""} onChange={(e) => set("pk_year_from", numOrNull(e.target.value))} className={inp} /></div>
          <div><label className={lbl}>PK year to</label><input type="number" value={f.pk_year_to ?? ""} onChange={(e) => set("pk_year_to", numOrNull(e.target.value))} className={inp} /></div>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-muted/20 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source &amp; Verification</h4>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className={lbl}>Source type *</label>
              <select value={f.source_type ?? ""} onChange={(e) => set("source_type", e.target.value || null)} className={inp}>
                <option value="">—</option>{SOURCE.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Source URL</label><input value={f.source_url ?? ""} onChange={(e) => set("source_url", e.target.value)} placeholder="https://…" className={inp} /></div>
            <div className="md:col-span-2"><label className={lbl}>Source notes</label><textarea value={f.source_notes ?? ""} onChange={(e) => set("source_notes", e.target.value)} rows={2} className={`${inp} h-auto py-2`} /></div>
            <div className="md:col-span-2"><label className={lbl}>Admin notes (internal only)</label><textarea value={f.admin_notes ?? ""} onChange={(e) => set("admin_notes", e.target.value)} rows={2} className={`${inp} h-auto py-2`} /></div>
            <div><label className={lbl}>Verification status</label>
              <select value={f.verification_status ?? "needs_verification"} onChange={(e) => set("verification_status", e.target.value)} className={inp}>
                {STATUS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          {wantVerified && missing.length > 0 && (
            <div className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
              To mark as <b>Verified</b>, complete: {missing.join(", ")}.
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-muted-foreground">Cancel</button>
          <button disabled={busy || (wantVerified && missing.length > 0)} onClick={() => onSave(f)} className="btn-primary text-sm disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
