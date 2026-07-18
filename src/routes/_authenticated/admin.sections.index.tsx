import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSectionsAdmin, setSectionVisible, setSectionStatus, duplicateSection, reorderSections } from "@/lib/sections.functions";
import { Eye, EyeOff, Copy, Pencil, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/sections/")({
  component: SectionsList,
});

function SectionsList() {
  const qc = useQueryClient();
  const list = useServerFn(listSectionsAdmin);
  const vis = useServerFn(setSectionVisible);
  const stat = useServerFn(setSectionStatus);
  const dup = useServerFn(duplicateSection);
  const reorder = useServerFn(reorderSections);
  const q = useQuery({ queryKey: ["adm-sections"], queryFn: () => list() });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["adm-sections"] }); qc.invalidateQueries({ queryKey: ["public-sections"] }); };
  const toggleVis = useMutation({ mutationFn: (v: { id: string; is_visible: boolean }) => vis({ data: v }), onSuccess: invalidate });
  const setStat = useMutation({ mutationFn: (v: { id: string; status: any }) => stat({ data: v }), onSuccess: invalidate });
  const dupSec = useMutation({ mutationFn: (id: string) => dup({ data: { id } }), onSuccess: invalidate });
  const move = useMutation({ mutationFn: (orders: { id: string; display_order: number }[]) => reorder({ data: { orders } }), onSuccess: invalidate });

  const sections = (q.data ?? []).slice().sort((a: any, b: any) => a.display_order - b.display_order);

  const swap = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= sections.length) return;
    const a = sections[idx], b = sections[j];
    move.mutate([{ id: a.id, display_order: b.display_order }, { id: b.id, display_order: a.display_order }]);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Homepage Sections</h1>
          <p className="mt-1 text-sm text-muted-foreground">Toggle sections on/off, edit content, reorder — then publish.</p>
        </div>
        <a href="/?preview=1" target="_blank" rel="noreferrer" className="btn-outline text-sm"><ExternalLink className="h-4 w-4" /> Preview homepage</a>
      </div>

      {q.isLoading ? <div className="mt-6 text-sm text-muted-foreground">Loading…</div> : sections.length === 0 ? (
        <div className="card-surface mt-6 bg-white p-8 text-center text-sm text-muted-foreground">No sections yet.</div>
      ) : (
        <div className="mt-6 space-y-2">
          {sections.map((s: any, idx: number) => (
            <div key={s.id} className={`card-surface bg-white p-3 flex items-center gap-3 ${s.archived ? "opacity-60" : ""}`}>
              <div className="flex flex-col">
                <button disabled={idx === 0} onClick={() => swap(idx, -1)} className="rounded p-1 hover:bg-muted disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button disabled={idx === sections.length - 1} onClick={() => swap(idx, 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{s.name}</div>
                <div className="text-[11px] text-muted-foreground">{s.type.replace(/_/g, " ")} · order {s.display_order}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${s.status === "published" ? "bg-green-100 text-green-700" : s.status === "archived" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"}`}>{s.status}</span>
              <button onClick={() => toggleVis.mutate({ id: s.id, is_visible: !s.is_visible })} title={s.is_visible ? "Hide" : "Show"} className="rounded p-1.5 hover:bg-muted">
                {s.is_visible ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </button>
              <Link to="/admin/sections/$id" params={{ id: s.id }} className="btn-outline text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</Link>
              {s.status !== "published" ? (
                <button onClick={() => setStat.mutate({ id: s.id, status: "published" })} className="rounded bg-green-600 px-2.5 py-1 text-xs font-semibold text-white">Publish</button>
              ) : (
                <button onClick={() => setStat.mutate({ id: s.id, status: "draft" })} className="rounded border border-border px-2.5 py-1 text-xs font-semibold">Unpublish</button>
              )}
              <button onClick={() => dupSec.mutate(s.id)} title="Duplicate" className="rounded p-1.5 hover:bg-muted"><Copy className="h-4 w-4" /></button>
              <button onClick={() => setStat.mutate({ id: s.id, status: s.archived ? "draft" : "archived" })} className="text-[11px] text-muted-foreground hover:text-red-600">{s.archived ? "Restore" : "Archive"}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
