import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCatalogueAdmin } from "@/lib/catalogue.functions";
import { listBrandsAdmin } from "@/lib/brands.functions";
import { listSectionsAdmin } from "@/lib/sections.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const cat = useQuery({ queryKey: ["adm-cat"], queryFn: useServerFn(listCatalogueAdmin) });
  const brands = useQuery({ queryKey: ["adm-brands"], queryFn: useServerFn(listBrandsAdmin) });
  const sections = useQuery({ queryKey: ["adm-sections"], queryFn: useServerFn(listSectionsAdmin) });

  const variants = cat.data?.variants ?? [];
  const models = cat.data?.models ?? [];
  const publishedVariants = variants.filter((v: any) => v.status === "published").length;
  const draftVariants = variants.filter((v: any) => v.status === "draft").length;
  const publishedBrands = (brands.data ?? []).filter((b: any) => b.is_active && !b.archived).length;
  const visibleSections = (sections.data ?? []).filter((s: any) => s.is_visible && s.status === "published").length;

  const outdated = variants.filter((v: any) => {
    if (!v.price_verified_at) return true;
    return (Date.now() - new Date(v.price_verified_at).getTime()) / 86400000 > 14;
  }).length;

  return (
    <div>
      <h1 className="font-display text-2xl">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">Snapshot of your catalogue and website content.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active brands" value={publishedBrands} />
        <Stat label="Tyre models" value={models.length} />
        <Stat label="Published sizes" value={publishedVariants} tone="ok" />
        <Stat label="Drafts" value={draftVariants} />
        <Stat label="Sections live" value={visibleSections} tone="ok" />
        <Stat label="Prices need review" value={outdated} tone={outdated > 0 ? "warn" : "muted"} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/admin/tyres/new" className="btn-primary text-sm">+ Add tyre</Link>
        <Link to="/admin/brands/new" className="btn-outline text-sm">+ Add brand</Link>
        <Link to="/admin/sections" className="btn-outline text-sm">Homepage sections</Link>
        <Link to="/admin/business" className="btn-outline text-sm">Business info</Link>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "muted" | "warn" }) {
  const c = tone === "ok" ? "text-green-600" : tone === "warn" ? "text-amber-600" : tone === "muted" ? "text-muted-foreground" : "text-ink";
  return (
    <div className="card-surface bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-3xl ${c}`}>{value}</div>
    </div>
  );
}
