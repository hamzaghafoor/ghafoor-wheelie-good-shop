import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVehiclesAdmin } from "@/lib/vehicles.functions";
import { listProductsAdmin } from "@/lib/catalogue-cms.functions";
import { bulkApplyFitment } from "@/lib/fitments.functions";
import { CheckSquare, Square, ShieldCheck, CheckCircle2, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/catalogue/fitments")({
  head: () => ({ meta: [{ title: "Bulk vehicle fitments | GMTL" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Page,
});

const STATUSES = [
  { value: "verified", label: "Verified fit", icon: ShieldCheck },
  { value: "commonly_used", label: "Commonly used", icon: CheckCircle2 },
  { value: "needs_confirmation", label: "Needs confirmation", icon: HelpCircle },
];

const CATS = ["", "tyres", "lubricants", "filters", "maintenance_parts", "car_care", "additives", "accessories"];

function Page() {
  const loadVeh = useServerFn(listVehiclesAdmin);
  const loadProds = useServerFn(listProductsAdmin);
  const applyFn = useServerFn(bulkApplyFitment);

  const veh = useQuery({ queryKey: ["adm-vehicles"], queryFn: () => loadVeh() });
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const prods = useQuery({
    queryKey: ["adm-products", cat, q],
    queryFn: () => loadProds({ data: { category: cat || undefined, q: q || undefined, status: "published" } }),
  });

  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [trim, setTrim] = useState("");
  const [engine, setEngine] = useState("");
  const [market, setMarket] = useState("PK");
  const [status, setStatus] = useState("commonly_used");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  const models = ((veh.data?.models ?? []) as any[]).filter((m) => m.make_id === makeId && !m.archived);
  const makes = ((veh.data?.makes ?? []) as any[]).filter((m) => !m.archived);
  const productList = (prods.data ?? []) as any[];

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === productList.length) setSelected(new Set());
    else setSelected(new Set(productList.map((p) => p.id)));
  };

  const apply = useMutation({
    mutationFn: () => applyFn({ data: {
      product_ids: Array.from(selected),
      make_id: makeId, model_id: modelId,
      year_from: yearFrom ? Number(yearFrom) : null,
      year_to: yearTo ? Number(yearTo) : null,
      trim: trim || null, engine: engine || null,
      market: market || "PK", status: status as any,
    } }),
    onSuccess: (r) => { setMsg({ ok: `Applied fitment to ${r.applied} product${r.applied === 1 ? "" : "s"}.` }); setSelected(new Set()); },
    onError: (e: any) => setMsg({ err: e.message }),
  });

  const canApply = selected.size > 0 && makeId && modelId;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">Bulk vehicle fitments</h1>
        <p className="text-sm text-muted-foreground">Attach one vehicle fitment to many products at once. Existing manually approved fitments are preserved.</p>
      </div>

      <section className="rounded-lg border border-border bg-white p-4">
        <h2 className="font-display text-base">Fitment to apply</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Field label="Make">
            <select value={makeId} onChange={(e) => { setMakeId(e.target.value); setModelId(""); }} className={inp}>
              <option value="">—</option>
              {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Model">
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} className={inp}>
              <option value="">—</option>
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Year from"><input type="number" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className={inp} /></Field>
          <Field label="Year to"><input type="number" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className={inp} /></Field>
          <Field label="Trim"><input value={trim} onChange={(e) => setTrim(e.target.value)} className={inp} /></Field>
          <Field label="Engine"><input value={engine} onChange={(e) => setEngine(e.target.value)} className={inp} /></Field>
          <Field label="Market"><input value={market} onChange={(e) => setMarket(e.target.value)} className={inp} /></Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inp}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Category">
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={inp}>
              {CATS.map((c) => <option key={c} value={c}>{c ? c.replace(/_/g, " ") : "All categories"}</option>)}
            </select>
          </Field>
          <Field label="Search">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product name…" className={inp} />
          </Field>
          <div className="ml-auto text-sm text-muted-foreground">{selected.size} selected · {productList.length} shown</div>
        </div>

        <div className="mt-3 max-h-[400px] overflow-y-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-10 p-2 text-left"><button onClick={toggleAll}>{selected.size === productList.length && productList.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}</button></th>
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {productList.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-surface-2">
                  <td className="p-2"><button onClick={() => toggle(p.id)}>{selected.has(p.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}</button></td>
                  <td className="p-2">{p.name}</td>
                  <td className="p-2 text-muted-foreground">{p.category?.replace(/_/g, " ")}</td>
                  <td className="p-2 text-muted-foreground">{p.status}</td>
                </tr>
              ))}
              {productList.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No products match filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {msg.err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
      {msg.ok && <div className="rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}

      <div className="flex gap-2">
        <button disabled={!canApply || apply.isPending} onClick={() => apply.mutate()} className="btn-primary text-sm">
          {apply.isPending ? "Applying…" : `Apply to ${selected.size} product${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}

const inp = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs"><span className="mb-1 block font-medium text-muted-foreground">{label}</span>{children}</label>;
}
