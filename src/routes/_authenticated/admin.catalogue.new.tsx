import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { upsertProduct, listLookups } from "@/lib/catalogue-cms.functions";

export const Route = createFileRoute("/_authenticated/admin/catalogue/new")({
  component: NewProduct,
});

const CATS = ["lubricants","filters","car_care","additives","accessories","maintenance_parts","services","tyres"] as const;
const inp = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm";

function NewProduct() {
  const nav = useNavigate();
  const upsert = useServerFn(upsertProduct);
  const looks = useServerFn(listLookups);
  const lookups = useQuery({ queryKey: ["cat-lookups"], queryFn: () => looks() });

  const [name, setName] = useState("");
  const [category, setCategory] = useState("lubricants");
  const [brandId, setBrandId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return setErr("Product name is required.");
    setErr(null); setBusy(true);
    try {
      const r = await upsert({ data: { name: name.trim(), category: category as any, brand_id: brandId || null, product_type_id: typeId || null, purpose_label_ids: [], images: [], specs: {} } });
      nav({ to: "/admin/catalogue/$id", params: { id: r.id } });
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const typesForCat = (lookups.data?.types ?? []).filter((t: any) => t.parent_category === category && !t.archived);

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl">New product</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter the basics; you can add variants, images and descriptions on the next step.</p>
      <div className="mt-5 space-y-3">
        <label className="block text-sm"><span className="mb-1 block font-medium">Product name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="e.g. Shell Helix Ultra 5W-30" />
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium">Category *</span>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setTypeId(""); }} className={inp}>
            {CATS.map((c) => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
          </select>
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium">Brand</span>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={inp}>
            <option value="">— none —</option>
            {(lookups.data?.brands ?? []).filter((b: any) => !b.archived).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium">Product type</span>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={inp}>
            <option value="">— none —</option>
            {typesForCat.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <span className="mt-1 block text-xs text-muted-foreground">Manage types in the Types & Labels tab.</span>
        </label>
        {err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{err}</div>}
        <div className="flex gap-2 pt-2">
          <button disabled={busy} onClick={submit} className="btn-primary text-sm">Create draft</button>
          <button onClick={() => nav({ to: "/admin/catalogue" })} className="ml-auto text-xs text-muted-foreground hover:text-ink">Cancel</button>
        </div>
      </div>
    </div>
  );
}
