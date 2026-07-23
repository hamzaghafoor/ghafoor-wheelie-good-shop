import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Package, Users, Image as ImageIcon, Settings, Upload } from "lucide-react";

const items = [
  { to: "/admin", label: "Home", icon: LayoutDashboard, match: (p: string) => p === "/admin" },
  { to: "/admin/catalogue", label: "Products", icon: Package, match: (p: string) => p.startsWith("/admin/catalogue") || p.startsWith("/admin/tyres") || p.startsWith("/admin/brands") },
  { to: "/admin/products/import", label: "Import", icon: Upload, match: (p: string) => p.startsWith("/admin/products/import") || p.startsWith("/admin/catalogue/import") || p.startsWith("/admin/catalogue/review") || p.startsWith("/admin/vehicles/import") || p.startsWith("/admin/vehicles/review") },
  { to: "/admin/leads", label: "Leads", icon: Users, match: (p: string) => p.startsWith("/admin/leads") || p.startsWith("/admin/appointments") },
  { to: "/admin/media", label: "Media", icon: ImageIcon, match: (p: string) => p.startsWith("/admin/media") || p.startsWith("/admin/sections") || p.startsWith("/admin/articles") || p.startsWith("/admin/videos") || p.startsWith("/admin/reviews") },
  { to: "/admin/business", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/admin/business") || p.startsWith("/admin/catalogue/settings") || p.startsWith("/admin/activity") },
];


export function AdminBottomNav() {
  const loc = useLocation();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-border bg-white shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Admin navigation"
    
    >
      {items.map((it) => {
        const active = it.match(loc.pathname);
        return (
          <Link
            key={it.to}
            to={it.to as any}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}
          >
            <it.icon className={`h-5 w-5 ${active ? "text-primary" : "text-ink/70"}`} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
