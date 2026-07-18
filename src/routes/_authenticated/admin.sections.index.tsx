import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSectionsAdmin, setSectionVisible, setSectionStatus, duplicateSection } from "@/lib/sections.functions";
import { Eye, EyeOff, Copy, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/sections/")({
  component: SectionsList,
});

function SectionsList() {
  const qc = useQueryClient();
  const list = useServerFn(listSectionsAdmin);
  const vis = useServerFn(setSectionVisible);
  const stat = useServerFn(setSectionStatus);
  const dup = useServerFn(duplicateSection);
  const q = useQuery({ queryKey: ["adm-sections"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["adm-sections"] });
  const toggleVis = useMutation({ mutationFn: (v: { id: string; is_visible: boolean }) => vis({ data: v }), onSuccess: invalidate });
  const setStat = useMutation({ mutationFn: (v: { id: string; status: any }) => stat({ data: v }), onSuccess: invalidate });
  const dupSec = useMutation({ mutationFn: (id: string) => dup({ data: { id } }), onSuccess: invalidate });

  const sections = q.data ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl">Homepage Sections</h1>
      <p className="mt-1 text-sm text-muted-foreground">Toggle sections on/off, edit content, and control the order they appear on the homepage.</p>

      {q.isLoading ? <div className="mt-6 text-sm text-muted-foreground">Loading…</div> : (
        <div className="mt-6 card-surface bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3 text-left">Section</th><th className="p-3">Type</th><th className="p-3">Order</th><th className="p-3">Visible</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {sections.map((s: any) => (
                <tr key={s.id} className={`border-t border-border ${s.archived ? "opacity-50" : ""}`}>
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3 text-center text-xs text-muted-foreground">{s.type}</td>
                  <td className="p-3 text-center text-muted-foreground">{s.display_order}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleVis.mutate({ id: s.id, is_visible: !s.is_visible })} className="rounded p-1 hover:bg-muted">
                      {s.is_visible ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${s.status === "published" ? "bg-green-100 text-green-700" : s.status === "archived" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"}`}>{s.status}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {s.status !== "published" ? (
                        <button onClick={() => setStat.mutate({ id: s.id, status: "published" })} className="rounded bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white">Publish</button>
                      ) : (
                        <button onClick={() => setStat.mutate({ id: s.id, status: "draft" })} className="rounded border border-border px-2 py-0.5 text-[10px] font-semibold">Unpublish</button>
                      )}
                      <Link to="/admin/sections/$id" params={{ id: s.id }} className="rounded p-1 hover:bg-muted"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => dupSec.mutate(s.id)} className="rounded p-1 hover:bg-muted" title="Duplicate"><Copy className="h-4 w-4" /></button>
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
