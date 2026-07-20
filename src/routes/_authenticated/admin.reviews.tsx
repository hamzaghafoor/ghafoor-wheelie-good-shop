import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listReviewsAdmin, upsertReview, deleteReview } from "@/lib/cms.functions";
import { Trash2, Pencil, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reviews")({ component: ReviewsAdmin });

const empty = { author_name: "", rating: 5, body: "", source: "manual" as const, published: false, display_order: 0, review_date: "" };

function ReviewsAdmin() {
  const list = useServerFn(listReviewsAdmin);
  const save = useServerFn(upsertReview);
  const del = useServerFn(deleteReview);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const q = useQuery({ queryKey: ["reviews-admin"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["reviews-admin"] });
  const mSave = useMutation({ mutationFn: (v: any) => save({ data: v }), onSuccess: () => { setEditing(null); invalidate(); } });
  const mDel = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: invalidate });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Customer Reviews</h1>
          <p className="text-sm text-muted-foreground">Add real Google reviews or customer testimonials. Only published items appear on the site.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setEditing({ ...empty })}>+ New review</button>
      </div>

      {q.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
        (q.data ?? []).length === 0 ? (
          <div className="rounded-lg border border-border bg-white p-8 text-center text-sm text-muted-foreground">No reviews yet. Add real customer reviews to display them on the site.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3 text-left">Author</th><th className="p-3">Rating</th><th className="p-3 text-left">Source</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {q.data!.map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3"><div className="font-medium">{r.author_name}</div><div className="text-xs text-muted-foreground line-clamp-1">{r.body}</div></td>
                    <td className="p-3 text-center">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span></td>
                    <td className="p-3 text-muted-foreground">{r.source}</td>
                    <td className="p-3 text-center">{r.published ? <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">Published</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Draft</span>}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <button className="rounded p-1 hover:bg-muted" onClick={() => mSave.mutate({ ...r, published: !r.published })} title={r.published ? "Unpublish" : "Publish"}>{r.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                        <button className="rounded p-1 hover:bg-muted" onClick={() => setEditing({ ...r, review_date: r.review_date ?? "" })} title="Edit"><Pencil className="h-4 w-4" /></button>
                        <button className="rounded p-1 hover:bg-muted text-red-600" onClick={() => { if (confirm("Delete this review?")) mDel.mutate(r.id); }} title="Delete"><Trash2 className="h-4 w-4" /></button>
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
            <h2 className="font-display text-lg mb-3">{editing.id ? "Edit review" : "New review"}</h2>
            <div className="space-y-3">
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Author name</span><input className="w-full h-9 rounded-md border border-border px-3" value={editing.author_name} onChange={(e) => setEditing({ ...editing, author_name: e.target.value })} /></label>
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Rating</span>
                <select className="w-full h-9 rounded-md border border-border px-2" value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} star{n>1?"s":""}</option>)}</select>
              </label>
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Review text</span><textarea className="w-full min-h-[100px] rounded-md border border-border px-3 py-2" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Source</span>
                  <select className="w-full h-9 rounded-md border border-border px-2" value={editing.source} onChange={(e) => setEditing({ ...editing, source: e.target.value })}>
                    <option value="manual">Manual</option><option value="google">Google</option><option value="facebook">Facebook</option><option value="other">Other</option>
                  </select>
                </label>
                <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Review date</span><input type="date" className="w-full h-9 rounded-md border border-border px-2" value={editing.review_date ?? ""} onChange={(e) => setEditing({ ...editing, review_date: e.target.value })} /></label>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="accent-primary" /> Published</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary text-sm" disabled={mSave.isPending || !editing.author_name || !editing.body} onClick={() => mSave.mutate({ ...editing, review_date: editing.review_date || null })}>{mSave.isPending ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
