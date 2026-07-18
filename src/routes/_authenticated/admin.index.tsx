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
  const cat = useServerFn(listCatalogueAdmin);
  const brands = useServerFn(listBrandsAdmin);
  const sections = useServerFn(listSectionsAdmin);

  const catQ = useQuery({ queryKey: ["adm-cat"], queryFn: () => cat() });
  const brandQ = useQuery({ queryKey: ["adm-brands"], queryFn: () => brands() });
  const sectQ = useQuery({ queryKey: ["adm-sections"], queryFn: () => sections() });

  const variants = catQ.data?.variants ?? [];
  const models = catQ.data?.models ?? [];
  const publishedVars = variants.filter((v: any) => v.status === "published").length;
  const draftVars = variants.filter((v: any) => v.status === "draft").length;
  const brandCount = brandQ.data?.filter((b: any) => !b.archived).length ?? 0;
  const publishedSections = sectQ.data?.filter((s: any) => s.status === "published" && s.is_visible).length ?? 0;

  return (
    <div>
      <h1 className="font-display text-2xl">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage tyres, brands, and website content.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active brands" value={brandCount} />
        <Stat label="Tyre models" value={models.length} />
        <Stat label="Published sizes" value={publishedVars} tone="ok" />
        <Stat label="Draft sizes" value={draftVars} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card-surface bg-white p-5">
          <h2 className="font-display text-lg">Quick actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/admin/tyres/new" className="btn-primary text-sm">+ Add tyre</Link>
            <Link to="/admin/brands/new" className="btn-outline text-sm">+ Add brand</Link>
            <Link to="/admin/sections" className="btn-outline text-sm">Homepage sections</Link>
          </div>
        </div>
        <div className="card-surface bg-white p-5">
          <h2 className="font-display text-lg">Live homepage</h2>
          <p className="mt-1 text-sm text-muted-foreground">{publishedSections} section{publishedSections === 1 ? "" : "s"} live.</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-primary">Preview site →</Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "muted" }) {
  return (
    <div className="card-surface bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-3xl ${tone === "ok" ? "text-green-600" : "text-ink"}`}>{value}</div>
    </div>
  );
}
