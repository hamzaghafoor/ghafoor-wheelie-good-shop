import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllTyresAdmin } from "@/lib/tyres.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetchAll = useServerFn(listAllTyresAdmin);
  const { data } = useQuery({ queryKey: ["admin-tyres-summary"], queryFn: () => fetchAll() });

  const total = data?.length ?? 0;
  const published = data?.filter((t: any) => t.status === "published").length ?? 0;
  const drafts = data?.filter((t: any) => t.status === "draft").length ?? 0;
  const archived = data?.filter((t: any) => t.status === "archived").length ?? 0;

  return (
    <div>
      <h1 className="font-display text-2xl">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back. Manage your tyre catalogue below.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total tyres" value={total} />
        <Stat label="Published" value={published} tone="ok" />
        <Stat label="Drafts" value={drafts} />
        <Stat label="Archived" value={archived} tone="muted" />
      </div>
      <div className="mt-6 flex gap-3">
        <Link to="/admin/tyres" className="btn-primary text-sm">Manage tyres</Link>
        <Link to="/admin/tyres/new" className="btn-outline text-sm">+ Add new tyre</Link>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "muted" }) {
  return (
    <div className="card-surface bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-3xl ${tone === "ok" ? "text-green-600" : tone === "muted" ? "text-muted-foreground" : "text-ink"}`}>{value}</div>
    </div>
  );
}
