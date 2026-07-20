import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listHomepageCatalogueSectionsAdmin, upsertHomepageCatalogueSection, deleteHomepageCatalogueSection, listLookups, listProductsAdmin } from "@/lib/catalogue-cms.functions";
import { Trash2, Eye, EyeOff, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/catalogue/homepage")({
  component: HomepageSectionsAdmin,
});

const KINDS = [
  { v: "heading", l: "Heading + description" },
  { v: "product_grid", l: "Product grid" },
  { v: "brand_grid", l: "Brand grid" },
  { v: "category_cards", l: "Category cards" },
  { v: "cta", l: "Call to action" },
] as const;
const CATS = ["tyres","lubricants","filters","maintenance_parts","car_care","additives","accessories","services"] as const;
const inp = "h-9 w-full rounded-md border border-border bg-white px-2 text-sm";

function HomepageSectionsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listHomepageCatalogueSectionsAdmin);
  const upsert = useServerFn(upsertHomepageCatalogueSection);
  const del = useServerFn(deleteHomepageCatalogueSection);
  const looks = useServerFn(listLookups);
  const listProds = useServerFn(listProductsAdmin);

  const sections = useQuery({ queryKey: ["hcs-admin"], queryFn: () => list() });
  const lookups = useQuery({ queryKey: ["cat-lookups"], queryFn: () => looks() });
  const products = useQuery({ queryKey: ["cat-products-all"], queryFn: () => listProds({ data: { status: "published" } }) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["hcs-admin"] });
  const mUpsert = useMutation({ mutationFn: (v: any) => upsert({ data: v }), onSuccess: invalidate });
  const mDel = useMutation({ mutationFn: (v: any) => del({ data: v }), onSuccess: invalidate });

  function addNew() {
    mUpsert.mutate({ kind: "heading", heading: "New section", description: "", cta_label: "", cta_link: "", product_ids: [], brand_ids: [], category_slugs: [], is_visible: false, display_order: ((sections.data?.at(-1) as any)?.display_order ?? 0) + 10 });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg">Homepage catalogue sections</h1>
          <p className="text-xs text-muted-foreground">Structured sections: heading, description, referenced products/brands/categories, CTA, visibility, order.</p>
        </div>
        <button onClick={addNew} className="btn-primary text-sm flex items-center gap-1"><Plus className="h-4 w-4" /> New section</button>
      </div>

      <div className="space-y-3">
        {(sections.data ?? []).map((sec: any) => (
          <SectionCard key={sec.id} sec={sec} brands={lookups.data?.brands ?? []} products={products.data ?? []} onSave={(patch) => mUpsert.mutate({ ...sec, ...patch })} onDelete={() => { if (confirm("Delete this section?")) mDel.mutate({ id: sec.id }); }} />
        ))}
        {(sections.data ?? []).length === 0 && <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No sections yet.</div>}
      </div>
    </div>
  );
}

function SectionCard({ sec, brands, products, onSave, onDelete }: any) {
  const [s, setS] = useState(sec);
  const [dirty, setDirty] = useState(false);
  function set(k: string, v: any) { setS({ ...s, [k]: v }); setDirty(true); }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="grid grid-cols-12 gap-2 items-start">
        <select value={s.kind} onChange={(e) => set("kind", e.target.value)} className={inp + " col-span-2"}>{KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select>
        <input value={s.heading ?? ""} onChange={(e) => set("heading", e.target.value)} placeholder="Heading" className={inp + " col-span-4"} />
        <input type="number" value={s.display_order ?? 0} onChange={(e) => set("display_order", Number(e.target.value))} className={inp + " col-span-1"} title="Order" />
        <button onClick={() => { set("is_visible", !s.is_visible); onSave({ is_visible: !s.is_visible }); }} className="col-span-1 rounded-md border border-border p-1.5" title={s.is_visible ? "Visible" : "Hidden"}>
          {s.is_visible ? <Eye className="h-4 w-4 mx-auto text-green-600" /> : <EyeOff className="h-4 w-4 mx-auto text-muted-foreground" />}
        </button>
        <button onClick={() => { onSave(s); setDirty(false); }} disabled={!dirty} className="btn-outline text-xs col-span-2">Save</button>
        <button onClick={onDelete} className="col-span-2 rounded-md border border-red-200 text-red-600 text-xs hover:bg-red-50 flex items-center justify-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
        <textarea rows={2} value={s.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Description" className="col-span-12 rounded-md border border-border bg-white p-2 text-sm" />
        <input value={s.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} placeholder="CTA label" className={inp + " col-span-4"} />
        <input value={s.cta_link ?? ""} onChange={(e) => set("cta_link", e.target.value)} placeholder="CTA link (e.g. /lubricants)" className={inp + " col-span-8"} />

        {s.kind === "product_grid" && (
          <div className="col-span-12">
            <div className="text-[11px] text-muted-foreground mb-1">Products</div>
            <div className="max-h-40 overflow-y-auto rounded border border-border p-2 space-y-1 bg-muted/30">
              {products.map((p: any) => {
                const on = (s.product_ids ?? []).includes(p.id);
                return <label key={p.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={on} onChange={() => set("product_ids", on ? s.product_ids.filter((x: string) => x !== p.id) : [...(s.product_ids ?? []), p.id])} className="accent-primary" /> {p.name}</label>;
              })}
            </div>
          </div>
        )}

        {s.kind === "brand_grid" && (
          <div className="col-span-12">
            <div className="text-[11px] text-muted-foreground mb-1">Brands</div>
            <div className="flex flex-wrap gap-1">
              {brands.filter((b: any) => !b.archived).map((b: any) => {
                const on = (s.brand_ids ?? []).includes(b.id);
                return <button key={b.id} type="button" onClick={() => set("brand_ids", on ? s.brand_ids.filter((x: string) => x !== b.id) : [...(s.brand_ids ?? []), b.id])} className={`rounded-full border px-2 py-0.5 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{b.name}</button>;
              })}
            </div>
          </div>
        )}

        {s.kind === "category_cards" && (
          <div className="col-span-12">
            <div className="text-[11px] text-muted-foreground mb-1">Categories</div>
            <div className="flex flex-wrap gap-1">
              {CATS.map((c) => {
                const on = (s.category_slugs ?? []).includes(c);
                return <button key={c} type="button" onClick={() => set("category_slugs", on ? s.category_slugs.filter((x: string) => x !== c) : [...(s.category_slugs ?? []), c])} className={`rounded-full border px-2 py-0.5 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{c.replace(/_/g," ")}</button>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
