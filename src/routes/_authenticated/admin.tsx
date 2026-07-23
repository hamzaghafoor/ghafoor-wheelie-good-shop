import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";
import { getMyAuthStatus } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Ghafoor Motors" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const fetchStatus = useServerFn(getMyAuthStatus);
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["auth-status"],
    queryFn: () => fetchStatus(),
    retry: false,
  });

  useEffect(() => {
    if (!data) return;
    if (!data.isAdmin) { navigate({ to: "/", replace: true }); return; }
    if (data.profile?.must_change_password && !location.pathname.endsWith("/change-password")) {
      navigate({ to: "/admin/change-password" as any });
    }
  }, [data, navigate, location.pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="p-8 text-sm text-red-600">Access denied.</div>;
  if (!data?.isAdmin) return <div className="p-8 text-sm">Redirecting…</div>;

  return (
    <div className="min-h-screen bg-surface">
      <div className="border-b border-border bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/admin" className="font-display text-lg text-ink">GMTL Admin</Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{data.profile?.email}</span>
            <Link to="/" className="hover:text-primary">View site</Link>
            <button onClick={signOut} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:border-primary hover:text-primary">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6 max-w-full overflow-x-auto">
          <Outlet />
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
