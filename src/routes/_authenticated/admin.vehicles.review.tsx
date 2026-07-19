import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listReviewQueue } from "@/lib/vehicle-import.functions";

export const Route = createFileRoute("/_authenticated/admin/vehicles/review")({
  head: () => ({ meta: [{ title: "Review Queue | GMTL Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ReviewQueue,
});

function ReviewQueue() {
  const fn = useServerFn(listReviewQueue);
  const q = useQuery({ queryKey: ["oem-review"], queryFn: () => fn() });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">OEM Review Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Newly imported records awaiting admin verification. Public pages do not show them.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/vehicles/import" className="btn-outline text-sm">Import</Link>
          <Link to="/admin/vehicles" className="btn-outline text-sm">Vehicles</Link>
        </div>
      </div>

      {q.isLoading && <div className="mt-6 text-sm text-muted-foreground">Loading…</div>}
      {q.data && (
        <div className="mt-6 space-y-6">
          <Section title="Configurations" empty="No configurations awaiting review.">
            {q.data.configurations.map((c: any) => (
              <div key={c.id} className="card-surface bg-white p-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{c.trim_name || "—"} <span className="text-xs text-muted-foreground">{c.engine_code} · {c.market}</span></div>
                  <div className="text-xs text-muted-foreground">Source: {c.source_type ?? "—"} {c.source_url && <a href={c.source_url} target="_blank" rel="noreferrer" className="ml-2 text-primary hover:underline">Open source ↗</a>}</div>
                </div>
                <Link to="/admin/vehicles/configurations/$configId" params={{ configId: c.id }} className="btn-outline text-xs">Open & verify</Link>
              </div>
            ))}
          </Section>
          <Section title="Tyre specifications" empty="No tyre specs awaiting review.">
            {q.data.tyreSpecs.map((t: any) => (
              <div key={t.id} className="card-surface bg-white p-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{t.front_size_label}{t.rear_size_label ? ` · rear ${t.rear_size_label}` : ""}</div>
                  <div className="text-xs text-muted-foreground">Source: {t.source_type ?? "—"}</div>
                </div>
                <Link to="/admin/vehicles/configurations/$configId" params={{ configId: t.configuration_id }} className="btn-outline text-xs">Open & verify</Link>
              </div>
            ))}
          </Section>
          <Section title="Engine-oil specifications" empty="No oil specs awaiting review.">
            {q.data.oilSpecs.map((o: any) => (
              <div key={o.id} className="card-surface bg-white p-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{o.sae_grade} <span className="text-xs text-muted-foreground">{o.api_standard}</span></div>
                  <div className="text-xs text-muted-foreground">Source: {o.source_type ?? "—"}</div>
                </div>
                <Link to="/admin/vehicles/configurations/$configId" params={{ configId: o.configuration_id }} className="btn-outline text-xs">Open & verify</Link>
              </div>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, empty, children }: any) {
  const items = Array.isArray(children) ? children : [children];
  const hasContent = items.some((c: any) => c);
  return (
    <section>
      <h2 className="font-display text-lg mb-2">{title}</h2>
      {hasContent ? <div className="space-y-2">{children}</div> : <div className="text-xs text-muted-foreground">{empty}</div>}
    </section>
  );
}
