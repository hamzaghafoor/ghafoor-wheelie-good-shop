import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/catalogue")({
  component: CatalogueLayout,
});

const EXCLUDE = /^\/admin\/catalogue\/(types|settings|homepage|fitments)/;
const TABS = [
  { to: "/admin/catalogue", label: "Products", match: (p: string) => /^\/admin\/catalogue(\/|$)/.test(p) && !EXCLUDE.test(p) },
  { to: "/admin/catalogue/types", label: "Types & Labels" },
  { to: "/admin/catalogue/settings", label: "Settings & Packaging" },
  { to: "/admin/catalogue/homepage", label: "Homepage Sections" },
  { to: "/admin/catalogue/fitments", label: "Vehicle Fitments" },
] as const;

function CatalogueLayout() {
  const loc = useLocation();
  const path = loc.pathname;
  const isActive = (t: typeof TABS[number]) =>
    t.match ? t.match.test(path) : path.startsWith(t.to);
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to as any}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${isActive(t) ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-ink"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
