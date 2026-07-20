import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Package, Tag, Image, LayoutTemplate, Building2, Activity, ChevronRight, Users, Settings, Megaphone, FileText, Search, Navigation, Phone, Calendar, MessageSquare, DollarSign } from "lucide-react";

type Item = { to: string; label: string; icon: any; soon?: boolean };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  { label: "", items: [{ to: "/admin", label: "Overview", icon: LayoutDashboard }] },
  { label: "Catalogue", items: [
    { to: "/admin/catalogue", label: "Products", icon: Package },
    { to: "/admin/tyres", label: "Tyres", icon: Package },
    { to: "/admin/brands", label: "Brands", icon: Tag },
    { to: "/admin/vehicles", label: "Vehicles", icon: Navigation },
    { to: "/admin/media", label: "Media Library", icon: Image },
  ]},
  { label: "Website", items: [
    { to: "/admin/sections", label: "Homepage Sections", icon: LayoutTemplate },
    { to: "/admin/pages", label: "Website Pages", icon: FileText, soon: true },
    { to: "/admin/navigation", label: "Navigation", icon: Navigation, soon: true },
    { to: "/admin/announcement", label: "Announcement Bar", icon: Megaphone, soon: true },
    { to: "/admin/footer", label: "Footer", icon: Navigation, soon: true },
    { to: "/admin/seo", label: "SEO", icon: Search, soon: true },
  ]},
  { label: "Customer Activity", items: [
    { to: "/admin/leads", label: "Leads", icon: Users },
    { to: "/admin/price-requests", label: "Price Requests", icon: DollarSign, soon: true },
    { to: "/admin/appointments", label: "Appointment Requests", icon: Calendar, soon: true },
    { to: "/admin/chatbot", label: "Chatbot Inquiries", icon: MessageSquare, soon: true },
  ]},
  { label: "Settings", items: [
    { to: "/admin/business", label: "Business Information", icon: Building2 },
    { to: "/admin/users", label: "Users & Roles", icon: Users, soon: true },
    { to: "/admin/integrations", label: "Integrations", icon: Settings, soon: true },
    { to: "/admin/activity", label: "Activity Log", icon: Activity },
  ]},
];

export function AdminSidebar() {
  const location = useLocation();
  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-border bg-white min-h-[calc(100vh-56px)]">
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {groups.map((g, i) => (
          <div key={i}>
            {g.label && <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</div>}
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(it.to);
                return (
                  <Link key={it.to} to={it.to as any}
                    className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${active ? "bg-primary/10 text-primary font-semibold" : "text-foreground/70 hover:bg-muted"}`}>
                    <it.icon className="h-4 w-4 flex-none" />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.soon && <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Soon</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
