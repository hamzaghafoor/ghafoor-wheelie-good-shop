import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Plus, ShieldCheck, HelpCircle, CheckCircle2 } from "lucide-react";
import { listVehiclesAdmin } from "@/lib/vehicles.functions";
import { listFitmentsForTarget, upsertFitment, deleteFitment } from "@/lib/fitments.functions";

type Props = {
  productId?: string;
  variantId?: string;
  title?: string;
  compact?: boolean;
};

const STATUSES = [
  { value: "verified", label: "Verified fit", icon: ShieldCheck, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "commonly_used", label: "Commonly used", icon: CheckCircle2, cls: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "needs_confirmation", label: "Needs confirmation", icon: HelpCircle, cls: "bg-amber-50 text-amber-800 border-amber-200" },
] as const;

export function FitmentManager({ productId, variantId, title = "Vehicle fitments", compact }: Props) {
  const qc = useQueryClient();
  const loadVeh = useServerFn(listVehiclesAdmin);
  const loadFit = useServerFn(listFitmentsForTarget);
  const upFn = useServerFn(upsertFitment);
  const delFn = useServerFn(deleteFitment);

  const key = ["fitments", productId ?? variantId];
  const veh = useQuery({ queryKey: ["adm-vehicles"], queryFn: () => loadVeh(), staleTime: 5 * 60 * 1000 });
  const rows = useQuery({
    queryKey: key,
    queryFn: () => loadFit({ data: productId ? { product_id: productId } : { variant_id: variantId! } }),
    enabled: !!(productId || variantId),
  });

  const [draft, setDraft] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const models = (veh.data?.models ?? []) as any[];
  const makes = (veh.data?.makes ?? []) as any[];
  const modelsByMake = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const m of models) (map[m.make_id] ||= []).push(m);
    return map;
  }, [models]);

  const save = useMutation({
    mutationFn: (d: any) => upFn({ data: {
      ...d,
      product_id: productId ?? null,
      variant_id: variantId ?? null,
      year_from: d.year_from ? Number(d.year_from) : null,
      year_to: d.year_to ? Number(d.year_to) : null,
      trim: d.trim || null,
      engine: d.engine || null,
      market: d.market || "PK",
      notes: d.notes || null,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setDraft(null); setMsg("Fitment saved."); setTimeout(() => setMsg(null), 1500); },
    onError: (e: any) => setMsg(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const list = (rows.data ?? []) as any[];

  return (
    <div className={`rounded-lg border border-border bg-white ${compact ? "p-3" : "p-4"} mt-6`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base">{title}</h3>
          <p className="text-xs text-muted-foreground">
            Link this {variantId ? "variant" : "product"} to specific vehicles. Verified fit shows only for admin-confirmed entries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft({ make_id: makes[0]?.id ?? "", model_id: "", year_from: "", year_to: "", trim: "", engine: "", market: "PK", status: "commonly_used" })}
          className="btn-outline text-xs flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Add fitment
        </button>
      </div>

      {msg && <div className="mt-2 text-xs text-muted-foreground">{msg}</div>}

      {list.length === 0 && !draft && (
        <div className="mt-3 rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No fitments yet.
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {list.map((f) => {
          const s = STATUSES.find((x) => x.value === f.status)!;
          const Icon = s.icon;
          const years = f.year_from || f.year_to ? `${f.year_from ?? "…"}–${f.year_to ?? "…"}` : "All years";
          return (
            <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span className="font-medium">{f.make?.name} {f.model?.name}</span>
              <span className="text-muted-foreground">{years}</span>
              {f.trim && <span className="text-muted-foreground">· {f.trim}</span>}
              {f.engine && <span className="text-muted-foreground">· {f.engine}</span>}
              <span className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>
                <Icon className="h-3 w-3" /> {s.label}
              </span>
              <button onClick={() => del.mutate(f.id)} className="text-muted-foreground hover:text-red-600" title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>

      {draft && (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <label className="text-xs">Make
              <select value={draft.make_id} onChange={(e) => setDraft({ ...draft, make_id: e.target.value, model_id: "" })} className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm">
                <option value="">—</option>
                {makes.filter((m) => !m.archived).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="text-xs">Model
              <select value={draft.model_id} onChange={(e) => setDraft({ ...draft, model_id: e.target.value })} className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm">
                <option value="">—</option>
                {(modelsByMake[draft.make_id] ?? []).filter((m) => !m.archived).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="text-xs">Year from
              <input type="number" value={draft.year_from} onChange={(e) => setDraft({ ...draft, year_from: e.target.value })} placeholder="e.g. 2014" className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm" />
            </label>
            <label className="text-xs">Year to
              <input type="number" value={draft.year_to} onChange={(e) => setDraft({ ...draft, year_to: e.target.value })} placeholder="e.g. 2018" className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm" />
            </label>
            <label className="text-xs">Trim
              <input value={draft.trim} onChange={(e) => setDraft({ ...draft, trim: e.target.value })} placeholder="XLI, Altis…" className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm" />
            </label>
            <label className="text-xs">Engine
              <input value={draft.engine} onChange={(e) => setDraft({ ...draft, engine: e.target.value })} placeholder="1.3L / 1.8L / 2AR-FE" className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm" />
            </label>
            <label className="text-xs">Market
              <input value={draft.market} onChange={(e) => setDraft({ ...draft, market: e.target.value })} className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm" />
            </label>
            <label className="text-xs">Fitment status
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-2 flex gap-2">
            <button disabled={!draft.make_id || !draft.model_id || save.isPending} onClick={() => save.mutate(draft)} className="btn-primary text-xs">
              {save.isPending ? "Saving…" : "Save fitment"}
            </button>
            <button onClick={() => setDraft(null)} className="text-xs text-muted-foreground hover:text-ink">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
