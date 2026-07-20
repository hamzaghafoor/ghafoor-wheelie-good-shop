import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listVideosAdmin, upsertVideo, deleteVideo } from "@/lib/cms.functions";
import { Trash2, Pencil, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/videos")({ component: VideosAdmin });

const empty = { title: "", provider: "youtube" as const, video_ref: "", thumbnail_url: "", description: "", published: false, display_order: 0 };

function VideosAdmin() {
  const list = useServerFn(listVideosAdmin);
  const save = useServerFn(upsertVideo);
  const del = useServerFn(deleteVideo);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const q = useQuery({ queryKey: ["videos-admin"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["videos-admin"] });
  const mSave = useMutation({ mutationFn: (v: any) => save({ data: v }), onSuccess: () => { setEditing(null); invalidate(); } });
  const mDel = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: invalidate });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Videos</h1>
          <p className="text-sm text-muted-foreground">Add real videos (YouTube ID, Vimeo ID, or URL). Only published items appear on the site.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setEditing({ ...empty })}>+ New video</button>
      </div>

      {q.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
        (q.data ?? []).length === 0 ? (
          <div className="rounded-lg border border-border bg-white p-8 text-center text-sm text-muted-foreground">No videos yet.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3 text-left">Title</th><th className="p-3 text-left">Provider</th><th className="p-3 text-left">Ref</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
              <tbody>
                {q.data!.map((v: any) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="p-3 font-medium">{v.title}</td>
                    <td className="p-3 text-muted-foreground">{v.provider}</td>
                    <td className="p-3 text-muted-foreground text-xs truncate max-w-[220px]">{v.video_ref}</td>
                    <td className="p-3 text-center">{v.published ? <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">Published</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Draft</span>}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <button className="rounded p-1 hover:bg-muted" onClick={() => mSave.mutate({ ...v, published: !v.published })} title={v.published ? "Unpublish" : "Publish"}>{v.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                        <button className="rounded p-1 hover:bg-muted" onClick={() => setEditing(v)} title="Edit"><Pencil className="h-4 w-4" /></button>
                        <button className="rounded p-1 hover:bg-muted text-red-600" onClick={() => { if (confirm("Delete this video?")) mDel.mutate(v.id); }} title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg mb-3">{editing.id ? "Edit video" : "New video"}</h2>
            <div className="space-y-3">
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Title</span><input className="w-full h-9 rounded-md border border-border px-3" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Provider</span>
                  <select className="w-full h-9 rounded-md border border-border px-2" value={editing.provider} onChange={(e) => setEditing({ ...editing, provider: e.target.value })}>
                    <option value="youtube">YouTube</option><option value="vimeo">Vimeo</option>
                  </select>
                </label>
                <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Display order</span><input type="number" className="w-full h-9 rounded-md border border-border px-3" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} /></label>
              </div>
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Video ID or URL</span><input className="w-full h-9 rounded-md border border-border px-3" value={editing.video_ref} onChange={(e) => setEditing({ ...editing, video_ref: e.target.value })} placeholder="e.g. dQw4w9WgXcQ" /></label>
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Thumbnail URL (optional)</span><input className="w-full h-9 rounded-md border border-border px-3" value={editing.thumbnail_url ?? ""} onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })} /></label>
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Description</span><textarea className="w-full min-h-[80px] rounded-md border border-border px-3 py-2" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="accent-primary" /> Published</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary text-sm" disabled={mSave.isPending || !editing.title || !editing.video_ref} onClick={() => mSave.mutate({ ...editing, thumbnail_url: editing.thumbnail_url || null })}>{mSave.isPending ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
