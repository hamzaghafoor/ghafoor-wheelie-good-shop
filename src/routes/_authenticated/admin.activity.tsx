import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const q = useQuery({
    queryKey: ["adm-activity"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl">Activity Log</h1>
      <p className="mt-1 text-sm text-muted-foreground">Recent changes made across your admin dashboard.</p>
      <div className="card-surface mt-6 bg-white overflow-hidden">
        {q.isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div> :
         (q.data?.length ?? 0) === 0 ? <div className="p-6 text-sm text-muted-foreground">No activity yet.</div> : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3 text-left">When</th><th className="p-3 text-left">Action</th><th className="p-3 text-left">Entity</th><th className="p-3 text-left">Details</th></tr>
            </thead>
            <tbody>
              {q.data!.map((a: any) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="p-3 text-xs font-mono">{a.action}</td>
                  <td className="p-3 text-xs">{a.entity_type} · {String(a.entity_id ?? "").slice(0, 8)}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-md truncate">{a.details ? JSON.stringify(a.details) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
         )}
      </div>
    </div>
  );
}
