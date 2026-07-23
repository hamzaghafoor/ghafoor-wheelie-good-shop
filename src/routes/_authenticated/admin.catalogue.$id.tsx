import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { getProductAdmin, upsertProduct, listLookups, upsertVariant, deleteVariant, setVariantStatus, uploadCatalogueImage } from "@/lib/catalogue-cms.functions";
import { Trash2, Star, Eye, EyeOff, Plus } from "lucide-react";
import { FitmentManager } from "@/components/admin/FitmentManager";

export const Route = createFileRoute("/_authenticated/admin/catalogue/$id")({
  component: EditProduct,
});

const CATS = ["lubricants","filters","car_care","additives","accessories","maintenance_parts","services","tyres"] as const;
const AVAIL = ["in_stock","limited","check","out_of_stock","on_order","discontinued"] as const;
const inp = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm";

function EditProduct() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fetchOne = useServerFn(getProductAdmin);
  const looks = useServerFn(listLookups);
  const upsert = useServerFn(upsertProduct);
  const upload = useServerFn(uploadCatalogueImage);

  const q = useQuery({ queryKey: ["cat-product", id], queryFn: () => fetchOne({ data: { id } }) });
  const lookups = useQuery({ queryKey: ["cat-lookups"], queryFn: () => looks() });

  const [p, setP] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  useEffect(() => { if (q.data?.product) setP(q.data.product); }, [q.data?.product]);
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  function set(key: string, val: any) { setP({ ...p, [key]: val }); setDirty(true); setMsg({}); }

  const save = useMutation({
    mutationFn: (status: "draft" | "published") => upsert({ data: { ...p, status, purpose_label_ids: p.purpose_label_ids ?? [], images: (p.images ?? []) as any, specs: p.specs ?? {} } }),
    onSuccess: (_r, status) => { setDirty(false); setMsg({ ok: `Saved as ${status}.` }); qc.invalidateQueries({ queryKey: ["cat-product", id] }); qc.invalidateQueries({ queryKey: ["cat-products"] }); },
    onError: (e: any) => setMsg({ err: e.message }),
  });

  async function onImageUpload(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = String(reader.result).split(",")[1];
      try {
        const r = await upload({ data: { filename: file.name, contentBase64: b64, contentType: file.type } });
        const next = [...(p.images ?? []), { path: r.path, alt: "" }];
        set("images", next);
      } catch (e: any) { setMsg({ err: e.message }); }
    };
    reader.readAsDataURL(file);
  }

  if (q.isLoading || !p) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (q.error) return <div className="text-sm text-red-600">{(q.error as Error).message}</div>;

  const typesForCat = (lookups.data?.types ?? []).filter((t: any) => t.parent_category === p.category && !t.archived);
  const labels = lookups.data?.labels ?? [];
  const labelsForType = labels.filter((l: any) => !l.archived && (!l.type_id || l.type_id === p.product_type_id));

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Catalogue › Product</div>
          <h1 className="font-display text-2xl">{p.name || "Untitled"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs font-medium ${p.status === "published" ? "bg-green-50 text-green-700" : p.status === "archived" ? "bg-muted" : "bg-amber-50 text-amber-700"}`}>{p.status}</span>
          <button onClick={() => window.open(`/products/${p.slug}?preview=1`, "_blank")} className="text-xs text-muted-foreground hover:text-ink">Preview →</button>
        </div>
      </div>

      {dirty && <div className="mb-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">You have unsaved changes.</div>}

      <div className="rounded-lg border border-border bg-white p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name *"><input value={p.name ?? ""} onChange={(e) => set("name", e.target.value)} className={inp} /></Field>
          <Field label="Slug"><input value={p.slug ?? ""} onChange={(e) => set("slug", e.target.value)} className={inp} /></Field>
          <Field label="Category *">
            <select value={p.category} onChange={(e) => set("category", e.target.value)} className={inp}>
              {CATS.map((c) => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
            </select>
          </Field>
          <Field label="Brand">
            <select value={p.brand_id ?? ""} onChange={(e) => set("brand_id", e.target.value || null)} className={inp}>
              <option value="">— none —</option>
              {(lookups.data?.brands ?? []).filter((b: any) => !b.archived).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Product type">
            <select value={p.product_type_id ?? ""} onChange={(e) => set("product_type_id", e.target.value || null)} className={inp}>
              <option value="">— none —</option>
              {typesForCat.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="SKU"><input value={p.sku ?? ""} onChange={(e) => set("sku", e.target.value)} className={inp} /></Field>
        </div>

        <Field label="Purpose labels (for additives etc.)">
          <div className="flex flex-wrap gap-1.5">
            {labelsForType.length === 0 && <span className="text-xs text-muted-foreground">No labels defined for this type yet.</span>}
            {labelsForType.map((l: any) => {
              const on = (p.purpose_label_ids ?? []).includes(l.id);
              return (
                <button key={l.id} type="button" onClick={() => set("purpose_label_ids", on ? p.purpose_label_ids.filter((x: string) => x !== l.id) : [...(p.purpose_label_ids ?? []), l.id])}
                  className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-ink"}`}>
                  {l.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Short description"><textarea rows={2} value={p.short_desc ?? ""} onChange={(e) => set("short_desc", e.target.value)} className="w-full rounded-md border border-border bg-white p-3 text-sm" /></Field>
        <Field label="Full description"><textarea rows={5} value={p.full_desc ?? ""} onChange={(e) => set("full_desc", e.target.value)} className="w-full rounded-md border border-border bg-white p-3 text-sm" /></Field>

        <Field label="Images">
          <div className="flex flex-wrap gap-2">
            {(p.images ?? []).map((img: any, i: number) => (
              <div key={i} className="relative h-24 w-24 rounded-md border border-border bg-muted overflow-hidden">
                <ImagePreview path={img.path} />
                <button onClick={() => set("images", p.images.filter((_: any, j: number) => j !== i))} className="absolute top-1 right-1 rounded bg-white/90 p-1 hover:bg-white"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
            <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f); e.currentTarget.value = ""; }} />
              + Upload
            </label>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Internal notes (never shown publicly)">
            <textarea rows={2} value={p.internal_notes ?? ""} onChange={(e) => set("internal_notes", e.target.value)} className="w-full rounded-md border border-border bg-white p-3 text-sm" />
          </Field>
          <Field label="ERP description (never shown publicly)">
            <textarea rows={2} value={p.erp_description ?? ""} onChange={(e) => set("erp_description", e.target.value)} className="w-full rounded-md border border-border bg-white p-3 text-sm" />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!p.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="accent-primary" /> Featured product</label>

        {msg.err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
        {msg.ok && <div className="rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button disabled={save.isPending} onClick={() => save.mutate("draft")} className="btn-outline text-sm">Save draft</button>
          <button disabled={save.isPending} onClick={() => save.mutate("published")} className="btn-primary text-sm">Save & publish</button>
          <button onClick={() => nav({ to: "/admin/catalogue" })} className="ml-auto text-xs text-muted-foreground hover:text-ink">Back to list</button>
        </div>
      </div>

      <VariantsPanel productId={id} initial={q.data?.variants ?? []} units={lookups.data?.units ?? []} presets={lookups.data?.presets ?? []} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>;
}

function ImagePreview({ path }: { path: string }) {
  // Cheap: uses signed URLs via server fn — but for simplicity we render placeholder text.
  // Signed URLs for admin previews would require calling signPath; keeping compact.
  return <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground p-1 text-center break-all">{path.split("/").pop()}</div>;
}

// ============ VARIANTS PANEL ============
function VariantsPanel({ productId, initial, units, presets }: { productId: string; initial: any[]; units: any[]; presets: any[] }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertVariant);
  const del = useServerFn(deleteVariant);
  const setStatus = useServerFn(setVariantStatus);
  const upload = useServerFn(uploadCatalogueImage);

  const [rows, setRows] = useState<any[]>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setRows(initial), [initial]);

  const visibleUnits = units.filter((u) => u.is_visible);

  function addRow() {
    const nextOrder = (rows.at(-1)?.display_order ?? 0) + 10;
    setRows([...rows, { _new: true, product_id: productId, pack_value: 1, pack_unit_code: visibleUnits[0]?.code ?? "L", pack_label: "", erp_stock_id: "", price: null, compare_at_price: null, availability: "check", is_default: rows.length === 0, display_order: nextOrder, status: "draft", image_path: null }]);
  }

  function updateRow(i: number, patch: any) { setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r))); }

  const saveOne = useMutation({
    mutationFn: (row: any) => upsert({ data: {
      id: row.id, product_id: productId, pack_value: Number(row.pack_value), pack_unit_code: row.pack_unit_code, pack_label: row.pack_label || null,
      erp_stock_id: row.erp_stock_id || null, price: row.price === "" || row.price == null ? null : Number(row.price),
      compare_at_price: row.compare_at_price === "" || row.compare_at_price == null ? null : Number(row.compare_at_price),
      availability: row.availability, image_path: row.image_path || null, is_default: !!row.is_default, display_order: Number(row.display_order || 0), status: row.status,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cat-product", productId] }); setMsg("Saved."); setTimeout(() => setMsg(null), 1500); },
    onError: (e: any) => setMsg(e.message),
  });

  const removeRow = useMutation({ mutationFn: (v: { id: string }) => del({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["cat-product", productId] }) });
  const setRowStatus = useMutation({ mutationFn: (v: { id: string; status: any }) => setStatus({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["cat-product", productId] }) });

  async function uploadImage(i: number, file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = String(reader.result).split(",")[1];
      const r = await upload({ data: { filename: file.name, contentBase64: b64, contentType: file.type } });
      updateRow(i, { image_path: r.path });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-6 rounded-lg border border-border bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">Pack variants</h2>
        <button onClick={addRow} className="btn-outline text-xs flex items-center gap-1"><Plus className="h-3 w-3" /> Add variant</button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Each variant is one SKU: pack size, ERP Stock ID, price and availability. 1 L and 1000 ml are treated as the same pack.</p>

      {presets.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Quick add:</span>
          {presets.filter((p) => p.is_active).map((p) => (
            <button key={p.id} onClick={() => setRows([...rows, { _new: true, product_id: productId, pack_value: Number(p.value_numeric), pack_unit_code: p.unit_code, pack_label: p.display_label ?? "", erp_stock_id: "", price: null, availability: "check", is_default: rows.length === 0, display_order: (rows.at(-1)?.display_order ?? 0) + 10, status: "draft" }])}
              className="rounded-full border border-border px-2.5 py-1 hover:border-primary hover:text-primary">{p.display_label ?? `${p.value_numeric} ${p.unit_code}`}</button>
          ))}
        </div>
      )}

      {msg && <div className="mt-2 text-xs text-muted-foreground">{msg}</div>}

      <div className="mt-3 space-y-2">
        {rows.length === 0 && <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No variants yet.</div>}
        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} className={`rounded-md border p-3 grid grid-cols-12 gap-2 items-end ${r.archived ? "border-border opacity-60" : "border-border"}`}>
            <div className="col-span-2">
              <label className="block text-[11px] text-muted-foreground">Pack value</label>
              <input type="number" step="0.01" value={r.pack_value ?? ""} onChange={(e) => updateRow(i, { pack_value: e.target.value })} className="h-9 w-full rounded-md border border-border px-2 text-sm" />
            </div>
            <div className="col-span-1">
              <label className="block text-[11px] text-muted-foreground">Unit</label>
              <select value={r.pack_unit_code} onChange={(e) => updateRow(i, { pack_unit_code: e.target.value })} className="h-9 w-full rounded-md border border-border px-1 text-sm">
                {visibleUnits.map((u) => <option key={u.code} value={u.code}>{u.display_label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] text-muted-foreground">Label (auto)</label>
              <input value={r.pack_label ?? ""} onChange={(e) => updateRow(i, { pack_label: e.target.value })} placeholder="auto" className="h-9 w-full rounded-md border border-border px-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] text-muted-foreground">ERP Stock ID</label>
              <input value={r.erp_stock_id ?? ""} onChange={(e) => updateRow(i, { erp_stock_id: e.target.value })} className="h-9 w-full rounded-md border border-border px-2 text-sm" />
            </div>
            <div className="col-span-1">
              <label className="block text-[11px] text-muted-foreground">Price</label>
              <input type="number" value={r.price ?? ""} onChange={(e) => updateRow(i, { price: e.target.value })} className="h-9 w-full rounded-md border border-border px-2 text-sm" />
            </div>
            <div className="col-span-1">
              <label className="block text-[11px] text-muted-foreground">Compare</label>
              <input type="number" value={r.compare_at_price ?? ""} onChange={(e) => updateRow(i, { compare_at_price: e.target.value })} className="h-9 w-full rounded-md border border-border px-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] text-muted-foreground">Availability</label>
              <select value={r.availability} onChange={(e) => updateRow(i, { availability: e.target.value })} className="h-9 w-full rounded-md border border-border px-1 text-sm">
                {AVAIL.map((a) => <option key={a} value={a}>{a.replace(/_/g," ")}</option>)}
              </select>
            </div>
            <div className="col-span-1 flex items-center gap-1">
              <label className="cursor-pointer" title="Set as default">
                <input type="radio" name={`def-${productId}`} checked={!!r.is_default} onChange={() => updateRow(i, { is_default: true })} className="hidden" />
                <Star className={`h-4 w-4 ${r.is_default ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </label>
              <label className="cursor-pointer text-[10px] text-muted-foreground">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(i, f); e.currentTarget.value = ""; }} />
                {r.image_path ? "✓ img" : "img"}
              </label>
            </div>

            <div className="col-span-12 flex items-center justify-end gap-2 pt-1">
              <span className="mr-auto text-[11px] text-muted-foreground">{r.status ?? "draft"}{r.archived ? " · archived" : ""}</span>
              {r.id && (
                r.status === "published"
                  ? <button onClick={() => setRowStatus.mutate({ id: r.id, status: "draft" })} className="text-xs text-muted-foreground hover:text-ink">Unpublish</button>
                  : <button onClick={() => setRowStatus.mutate({ id: r.id, status: "published" })} className="text-xs text-primary">Publish</button>
              )}
              <button onClick={() => saveOne.mutate(r)} disabled={saveOne.isPending} className="btn-outline text-xs">Save</button>
              {r.id && <button onClick={() => { if (confirm("Delete this variant permanently?")) removeRow.mutate({ id: r.id }); }} className="text-xs text-red-600 hover:underline">Delete</button>}
              {!r.id && <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-xs text-muted-foreground hover:text-ink">Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
