import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getConfigurationDetail, upsertTyreSpec, upsertOilSpec, archiveOemRecord } from "@/lib/oem.functions";
import { Plus, Archive, RotateCcw, ChevronLeft, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/vehicles/configurations/$configId")({
  component: ConfigDetailPage,
});

const inp = "h-9 rounded border border-border bg-white px-2 text-sm w-full";
const lbl = "block text-xs font-medium text-muted-foreground mb-1";
const SOURCE = ["manufacturer","owner_manual","official_dealer","trusted_publication","community","other"] as const;
const STATUS = ["needs_verification","partial","verified","disputed"] as const;
const RELIABLE = ["manufacturer","owner_manual","official_dealer"];

function badge(s: string, archived?: boolean) {
  if (archived) return { label: "Archived", cls: "bg-gray-200 text-gray-700" };
  switch (s) {
    case "verified": return { label: "Verified", cls: "bg-green-100 text-green-800" };
    case "partial": return { label: "Partial", cls: "bg-amber-100 text-amber-800" };
    case "disputed": return { label: "Disputed", cls: "bg-red-100 text-red-800" };
    default: return { label: "Draft", cls: "bg-slate-100 text-slate-700" };
  }
}

function ConfigDetailPage() {
  const { configId } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getConfigurationDetail);
  const saveTyre = useServerFn(upsertTyreSpec);
  const saveOil = useServerFn(upsertOilSpec);
  const arch = useServerFn(archiveOemRecord);
  const q = useQuery({ queryKey: ["adm-cfg", configId], queryFn: () => load({ data: { configId } }) });
  const [tab, setTab] = useState<"tyre" | "oil">("tyre");
  const [editingTyre, setEditingTyre] = useState<any | null>(null);
  const [editingOil, setEditingOil] = useState<any | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ["adm-cfg", configId] });

  const mT = useMutation({ mutationFn: (d: any) => saveTyre({ data: d }), onSuccess: () => { setEditingTyre(null); setMsg("Saved."); inv(); }, onError: (e: any) => setMsg(e.message) });
  const mO = useMutation({ mutationFn: (d: any) => saveOil({ data: d }), onSuccess: () => { setEditingOil(null); setMsg("Saved."); inv(); }, onError: (e: any) => setMsg(e.message) });
  const mA = useMutation({ mutationFn: (d: any) => arch({ data: d }), onSuccess: inv });

  const c = q.data?.config as any;

  return (
    <div>
      <Link to="/admin/vehicles/$modelId" params={{ modelId: c?.model_id ?? "" }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3 w-3" /> Back to configurations
      </Link>
      <h1 className="mt-1 font-display text-2xl">
        {q.data?.make?.name} {q.data?.model?.name}
        {c && <span className="ml-2 text-lg font-normal text-muted-foreground">{c.trim_name} {c.engine_code && `· ${c.engine_code}`}</span>}
      </h1>
      {c && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className={`rounded px-1.5 py-0.5 font-medium ${badge(c.verification_status, c.archived).cls}`}>{badge(c.verification_status, c.archived).label}</span>
          <span className="text-muted-foreground">{c.market} · {c.fuel_type ?? "—"} · {c.production_year_from ?? "—"}{c.production_year_to ? "–" + c.production_year_to : ""}</span>
        </div>
      )}

      {msg && <div className="mt-3 rounded-md bg-green-50 p-2 text-xs text-green-800">{msg}</div>}

      <div className="mt-5 border-b border-border">
        <div className="flex gap-1">
          <button onClick={() => setTab("tyre")} className={`px-3 py-2 text-sm ${tab === "tyre" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}>Tyre specs ({q.data?.tyreSpecs.length ?? 0})</button>
          <button onClick={() => setTab("oil")} className={`px-3 py-2 text-sm ${tab === "oil" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}>Engine-oil specs ({q.data?.oilSpecs.length ?? 0})</button>
        </div>
      </div>

      {tab === "tyre" ? (
        <SpecList
          kind="tyre"
          rows={q.data?.tyreSpecs ?? []}
          onAdd={() => setEditingTyre({ configuration_id: configId, layout: "same", verification_status: "needs_verification" })}
          onEdit={(r: any) => setEditingTyre(r)}
          onArchive={(id: string, archived: boolean) => mA.mutate({ kind: "tyre", id, archived })}
          renderRow={(r: any) => (
            <>
              <td className="p-2 font-medium">{r.front_size_label}{r.rear_size_label && ` / ${r.rear_size_label}`}</td>
              <td className="p-2 text-xs">{r.layout}</td>
              <td className="p-2 text-xs">{[r.front_load_index, r.front_speed_rating].filter(Boolean).join("") || "—"}</td>
              <td className="p-2 text-xs">{r.source_type ?? "—"}</td>
            </>
          )}
          headers={["Size", "Layout", "LI/SR", "Source"]}
        />
      ) : (
        <SpecList
          kind="oil"
          rows={q.data?.oilSpecs ?? []}
          onAdd={() => setEditingOil({ configuration_id: configId, verification_status: "needs_verification" })}
          onEdit={(r) => setEditingOil(r)}
          onArchive={(id, archived) => mA.mutate({ kind: "oil", id, archived })}
          renderRow={(r: any) => (
            <>
              <td className="p-2 font-medium">{r.sae_grade ?? "—"}</td>
              <td className="p-2 text-xs">{[r.api_standard, r.acea_standard, r.ilsac_standard, r.jaso_standard].filter(Boolean).join(" · ") || "—"}</td>
              <td className="p-2 text-xs">{r.capacity_with_filter_l ? `${r.capacity_with_filter_l}L (w/ filter)` : r.capacity_without_filter_l ? `${r.capacity_without_filter_l}L` : "—"}</td>
              <td className="p-2 text-xs">{r.source_type ?? "—"}</td>
            </>
          )}
          headers={["SAE", "Standards", "Capacity", "Source"]}
        />
      )}

      {editingTyre && <TyreSpecForm initial={editingTyre} onCancel={() => setEditingTyre(null)} onSave={(d: any) => mT.mutate(d)} busy={mT.isPending} />}
      {editingOil && <OilSpecForm initial={editingOil} onCancel={() => setEditingOil(null)} onSave={(d: any) => mO.mutate(d)} busy={mO.isPending} />}
    </div>
  );
}

function SpecList({ rows, headers, renderRow, onAdd, onEdit, onArchive }: any) {
  return (
    <div className="mt-4">
      <div className="mb-3 flex justify-end">
        <button onClick={onAdd} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Add specification</button>
      </div>
      {rows.length === 0 ? (
        <div className="card-surface bg-white p-8 text-center text-sm text-muted-foreground">No specifications yet.</div>
      ) : (
        <div className="overflow-x-auto card-surface bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-2 text-left w-8"></th>
                {headers.map((h: string) => <th key={h} className="p-2 text-left">{h}</th>)}
                <th className="p-2 text-left">Status</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const b = badge(r.verification_status, r.archived);
                return (
                  <tr key={r.id} className={`border-t border-border ${r.archived ? "opacity-60" : ""}`}>
                    <td className="p-2">{r.is_primary && <Star className="h-4 w-4 fill-amber-400 text-amber-500" />}</td>
                    {renderRow(r)}
                    <td className="p-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${b.cls}`}>{b.label}</span></td>
                    <td className="p-2 text-right">
                      <button onClick={() => onEdit(r)} className="text-xs text-primary hover:underline">Edit</button>
                      <button onClick={() => onArchive(r.id, !r.archived)} className="ml-2 rounded p-1 hover:bg-muted" title={r.archived ? "Restore" : "Archive"}>
                        {r.archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SourceBlock({ f, set }: any) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source &amp; Verification</h4>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div><label className={lbl}>Source type *</label>
          <select value={f.source_type ?? ""} onChange={(e) => set("source_type", e.target.value || null)} className={inp}>
            <option value="">—</option>{SOURCE.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div><label className={lbl}>Source URL</label><input value={f.source_url ?? ""} onChange={(e) => set("source_url", e.target.value)} className={inp} /></div>
        <div className="md:col-span-2"><label className={lbl}>Source notes</label><textarea value={f.source_notes ?? ""} onChange={(e) => set("source_notes", e.target.value)} rows={2} className={`${inp} h-auto py-2`} /></div>
        <div className="md:col-span-2"><label className={lbl}>Admin notes</label><textarea value={f.admin_notes ?? ""} onChange={(e) => set("admin_notes", e.target.value)} rows={2} className={`${inp} h-auto py-2`} /></div>
        <div><label className={lbl}>Verification status</label>
          <select value={f.verification_status ?? "needs_verification"} onChange={(e) => set("verification_status", e.target.value)} className={inp}>
            {STATUS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <label className="flex items-end gap-2 text-sm"><input type="checkbox" checked={!!f.is_primary} onChange={(e) => set("is_primary", e.target.checked)} /> Primary specification</label>
      </div>
    </div>
  );
}

function TyreSpecForm({ initial, onCancel, onSave, busy }: any) {
  const [f, setF] = useState<any>({ ...initial });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const wantVerified = f.verification_status === "verified";
  const missing: string[] = [];
  if (wantVerified && !RELIABLE.includes(f.source_type)) missing.push("Reliable source (manufacturer / owner manual / official dealer)");
  const staggered = f.layout === "staggered";
  const rearOk = !staggered || (f.rear_width && f.rear_profile && f.rear_rim);
  const frontOk = f.front_width && f.front_profile && f.front_rim;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="font-display text-lg">{f.id ? "Edit tyre spec" : "New tyre spec"}</h3>

        <div className="mt-4 space-y-4">
          <div><label className={lbl}>Layout</label>
            <select value={f.layout} onChange={(e) => set("layout", e.target.value)} className={inp}>
              <option value="same">Same size front &amp; rear</option>
              <option value="staggered">Staggered (different rear)</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Front (required)</div>
            <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-5">
              <div><label className={lbl}>Width</label><input type="number" value={f.front_width ?? ""} onChange={(e) => set("front_width", num(e.target.value))} className={inp} /></div>
              <div><label className={lbl}>Profile</label><input type="number" value={f.front_profile ?? ""} onChange={(e) => set("front_profile", num(e.target.value))} className={inp} /></div>
              <div><label className={lbl}>Rim</label><input type="number" value={f.front_rim ?? ""} onChange={(e) => set("front_rim", num(e.target.value))} className={inp} /></div>
              <div><label className={lbl}>Load index</label><input type="number" value={f.front_load_index ?? ""} onChange={(e) => set("front_load_index", num(e.target.value))} className={inp} /></div>
              <div><label className={lbl}>Speed rating</label><input value={f.front_speed_rating ?? ""} onChange={(e) => set("front_speed_rating", e.target.value)} placeholder="H, V…" className={inp} /></div>
            </div>
          </div>

          {staggered && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rear (required for staggered)</div>
              <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-5">
                <div><label className={lbl}>Width</label><input type="number" value={f.rear_width ?? ""} onChange={(e) => set("rear_width", num(e.target.value))} className={inp} /></div>
                <div><label className={lbl}>Profile</label><input type="number" value={f.rear_profile ?? ""} onChange={(e) => set("rear_profile", num(e.target.value))} className={inp} /></div>
                <div><label className={lbl}>Rim</label><input type="number" value={f.rear_rim ?? ""} onChange={(e) => set("rear_rim", num(e.target.value))} className={inp} /></div>
                <div><label className={lbl}>Load index</label><input type="number" value={f.rear_load_index ?? ""} onChange={(e) => set("rear_load_index", num(e.target.value))} className={inp} /></div>
                <div><label className={lbl}>Speed rating</label><input value={f.rear_speed_rating ?? ""} onChange={(e) => set("rear_speed_rating", e.target.value)} className={inp} /></div>
              </div>
            </div>
          )}
        </div>

        <SourceBlock f={f} set={set} />

        {wantVerified && missing.length > 0 && <div className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-900">To mark as Verified: {missing.join(", ")}.</div>}
        {(!frontOk || !rearOk) && <div className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-900">Fill all required size fields.</div>}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-muted-foreground">Cancel</button>
          <button disabled={busy || !frontOk || !rearOk || (wantVerified && missing.length > 0)} onClick={() => onSave(f)} className="btn-primary text-sm disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OilSpecForm({ initial, onCancel, onSave, busy }: any) {
  const [f, setF] = useState<any>({ ...initial });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const wantVerified = f.verification_status === "verified";
  const missing: string[] = [];
  if (wantVerified) {
    if (!f.sae_grade?.trim()) missing.push("SAE grade");
    if (![f.api_standard, f.acea_standard, f.ilsac_standard, f.jaso_standard].some((v) => v && v.trim())) missing.push("At least one standard (API / ACEA / ILSAC / JASO)");
    if (!RELIABLE.includes(f.source_type)) missing.push("Reliable source");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="font-display text-lg">{f.id ? "Edit oil spec" : "New oil spec"}</h3>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><label className={lbl}>SAE grade *</label><input value={f.sae_grade ?? ""} onChange={(e) => set("sae_grade", e.target.value)} placeholder="0W-20, 5W-30…" className={inp} /></div>
          <div><label className={lbl}>API standard *</label><input value={f.api_standard ?? ""} onChange={(e) => set("api_standard", e.target.value)} placeholder="SP, SN Plus…" className={inp} /></div>
          <div><label className={lbl}>ACEA standard</label><input value={f.acea_standard ?? ""} onChange={(e) => set("acea_standard", e.target.value)} placeholder="A5/B5, C3…" className={inp} /></div>
          <div><label className={lbl}>ILSAC standard</label><input value={f.ilsac_standard ?? ""} onChange={(e) => set("ilsac_standard", e.target.value)} placeholder="GF-6A…" className={inp} /></div>
          <div><label className={lbl}>JASO standard</label><input value={f.jaso_standard ?? ""} onChange={(e) => set("jaso_standard", e.target.value)} className={inp} /></div>
          <div><label className={lbl}>OEM approvals (comma-separated)</label>
            <input value={(f.oem_approvals ?? []).join(", ")} onChange={(e) => set("oem_approvals", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} className={inp} />
          </div>
          <div><label className={lbl}>Capacity with filter (L)</label><input type="number" step="0.1" value={f.capacity_with_filter_l ?? ""} onChange={(e) => set("capacity_with_filter_l", num(e.target.value))} className={inp} /></div>
          <div><label className={lbl}>Capacity without filter (L)</label><input type="number" step="0.1" value={f.capacity_without_filter_l ?? ""} onChange={(e) => set("capacity_without_filter_l", num(e.target.value))} className={inp} /></div>
          <div><label className={lbl}>Change interval (km)</label><input type="number" value={f.change_interval_km ?? ""} onChange={(e) => set("change_interval_km", num(e.target.value))} className={inp} /></div>
          <div><label className={lbl}>Change interval (months)</label><input type="number" value={f.change_interval_months ?? ""} onChange={(e) => set("change_interval_months", num(e.target.value))} className={inp} /></div>
        </div>

        <SourceBlock f={f} set={set} />

        {wantVerified && missing.length > 0 && <div className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-900">To mark as Verified: {missing.join(", ")}.</div>}

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
