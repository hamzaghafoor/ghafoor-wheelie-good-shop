import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listProductsAdmin, listLookups, setProductStatus, archiveProduct, duplicateProduct, upsertProduct } from "@/lib/catalogue-cms.functions";
import { Pencil, Copy, Archive, ArchiveRestore, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/catalogue/")({
  component: ProductsList,
});

function ProductsList() {
  const nav = useNavigate();
  const list = useServerFn(listProductsAdmin);
  const looks = useServerFn(listLookups);
  const setStatus = useServerFn(setProductStatus);
  const archive = useServerFn(archiveProduct);
  const dup = useServerFn(duplicateProduct);
  const upsert = useServerFn(upsertProduct);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [brandId, setBrandId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [status, setStatusFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const lookups = useQuery({ queryKey: ["cat-lookups"], queryFn: () => looks() });
  const products = useQuery({
    queryKey: ["cat-products", q, category, brandId, typeId, status, showArchived],
    queryFn: () => list({ data: { q: q || undefined, category: category || undefined, brand_id: brandId || undefined, type_id: typeId || undefined, status: status || undefined, show_archived: showArchived } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cat-products"] });
  const mStatus = useMutation({ mutationFn: (v: { id: string; status: any }) => setStatus({ data: v }), onSuccess: invalidate });
  const mArchive = useMutation({ mutationFn: (v: { id: string; archived: boolean }) => archive({ data: v }), onSuccess: invalidate });
  const mDup = useMutation({ mutationFn: (v: { id: string }) => dup({ data: v }), onSuccess: (r) => nav({ to: "/admin/catalogue/$id", params: { id: r.id } }) });

  const CATS = ["lubricants","filters","car_care","additives","accessories","maintenance_parts","services","tyres"] as const;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl">Catalogue Products</h1>
          <p className="text-sm text-muted-foreground">Manage lubricants, filters, additives, accessories and more.</p>
        </div>
        <Link to="/admin/catalogue/new" className="btn-primary text-sm">+ New product</Link>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 rounded-lg border border-border bg-white p-3">
        <input placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 flex-1 min-w-[180px] rounded-md border border-border px-3 text-sm" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border border-border px-2 text-sm">
          <option value="">All categories</option>
          {CATS.map((c) => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
        </select>
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="h-9 rounded-md border border-border px-2 text-sm">
          <option value="">All brands</option>
          {(lookups.data?.brands ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="h-9 rounded-md border border-border px-2 text-sm">
          <option value="">All types</option>
          {(lookups.data?.types ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-border px-2 text-sm">
          <option value="">Any status</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
        </select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-primary" /> Show archived</label>
      </div>

      {products.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
       (products.data ?? []).length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center text-sm text-muted-foreground">
          No products yet. <Link to="/admin/catalogue/new" className="text-primary underline">Add your first product</Link>.
        </div>
       ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Status</th><th className="p-3">Featured</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {(products.data ?? []).map((p: any) => (
                <tr key={p.id} className={`border-t border-border ${p.archived ? "opacity-50" : ""}`}>
                  <td className="p-3">
                    <Link to="/admin/catalogue/$id" params={{ id: p.id }} className="font-medium hover:text-primary">{p.name}</Link>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.category.replace(/_/g," ")}</td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${p.status === "published" ? "bg-green-50 text-green-700" : p.status === "archived" ? "bg-muted text-muted-foreground" : "bg-amber-50 text-amber-700"}`}>{p.status}</span>
                  </td>
                  <td className="p-3 text-center">{p.is_featured ? "★" : "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to="/admin/catalogue/$id" params={{ id: p.id }} className="rounded p-1 hover:bg-muted" title="Edit"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => mDup.mutate({ id: p.id })} className="rounded p-1 hover:bg-muted" title="Duplicate"><Copy className="h-4 w-4" /></button>
                      {p.status === "published"
                        ? <button onClick={() => mStatus.mutate({ id: p.id, status: "draft" })} className="rounded p-1 hover:bg-muted" title="Unpublish"><EyeOff className="h-4 w-4" /></button>
                        : <button onClick={() => mStatus.mutate({ id: p.id, status: "published" })} className="rounded p-1 hover:bg-muted" title="Publish"><Eye className="h-4 w-4" /></button>}
                      <button onClick={() => { if (confirm(p.archived ? "Restore this product?" : "Archive this product?")) mArchive.mutate({ id: p.id, archived: !p.archived }); }} className="rounded p-1 hover:bg-muted" title={p.archived ? "Restore" : "Archive"}>
                        {p.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       )}
    </div>
  );
}
