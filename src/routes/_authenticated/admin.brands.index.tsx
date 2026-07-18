import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBrandsAdmin, archiveBrand, upsertBrand } from "@/lib/brands.functions";
import { Pencil, Archive, ArchiveRestore, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/brands/")({
  component: BrandsList,
});

function BrandsList() {
  const list = useServerFn(listBrandsAdmin);
  const arch = useServerFn(archiveBrand);
  const upsert = useServerFn(upsertBrand);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["adm-brands"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["adm-brands"] });

  const toggleArchive = useMutation({ mutationFn: (v: { id: string; archived: boolean }) => arch({ data: v }), onSuccess: invalidate });
  const toggleFeature = useMutation({
    mutationFn: (b: any) => upsert({ data: { id: b.id, name: b.name, is_featured: !b.is_featured, is_active: b.is_active, display_order: b.display_order, logo_url: b.logo_url, country: b.country, description: b.description } }),
    onSuccess: invalidate,
  });
  const toggleActive = useMutation({
    mutationFn: (b: any) => upsert({ data: { id: b.id, name: b.name, is_featured: b.is_featured, is_active: !b.is_active, display_order: b.display_order, logo_url: b.logo_url, country: b.country, description: b.description } }),
    onSuccess: invalidate,
  });

  const brands = q.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Brands</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tyre brands displayed on the site.</p>
        </div>
        <Link to="/admin/brands/new" className="btn-primary text-sm">+ Add brand</Link>
      </div>

      {q.isLoading ? <div className="mt-6 text-sm text-muted-foreground">Loading…</div> : brands.length === 0 ? (
        <div className="card-surface mt-6 bg-white p-8 text-center">
          <p className="text-sm text-muted-foreground">No brands yet.</p>
          <Link to="/admin/brands/new" className="btn-primary mt-3 inline-flex text-sm">+ Add your first brand</Link>
        </div>
      ) : (
        <div className="card-surface mt-6 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3 text-left">Brand</th><th className="p-3 text-left">Country</th><th className="p-3">Featured</th><th className="p-3">Active</th><th className="p-3">Order</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {brands.map((b: any) => (
                <tr key={b.id} className={`border-t border-border ${b.archived ? "opacity-50" : ""}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {b.logo_signed_url ? <img src={b.logo_signed_url} alt="" className="h-8 w-8 rounded object-contain bg-muted" /> : <div className="h-8 w-8 rounded bg-muted" />}
                      <div className="font-medium">{b.name}</div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{b.country ?? "—"}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleFeature.mutate(b)} title="Toggle featured"><Star className={`h-4 w-4 ${b.is_featured ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleActive.mutate(b)} className={`text-xs font-semibold ${b.is_active ? "text-green-600" : "text-muted-foreground"}`}>{b.is_active ? "Yes" : "No"}</button>
                  </td>
                  <td className="p-3 text-center text-muted-foreground">{b.display_order}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link to="/admin/brands/$id" params={{ id: b.id }} className="rounded p-1 hover:bg-muted"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => toggleArchive.mutate({ id: b.id, archived: !b.archived })} className="rounded p-1 hover:bg-muted" title={b.archived ? "Restore" : "Archive"}>
                        {b.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
