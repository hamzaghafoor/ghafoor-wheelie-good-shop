import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listArticlesAdmin, upsertArticle, deleteArticle } from "@/lib/cms.functions";
import { Trash2, Pencil, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/articles")({ component: ArticlesAdmin });

const empty = { title: "", slug: "", excerpt: "", body_md: "", tags: [] as string[], seo_title: "", seo_description: "", cover_image_path: "", published: false, display_order: 0 };

function ArticlesAdmin() {
  const list = useServerFn(listArticlesAdmin);
  const save = useServerFn(upsertArticle);
  const del = useServerFn(deleteArticle);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const q = useQuery({ queryKey: ["articles-admin"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["articles-admin"] });
  const mSave = useMutation({ mutationFn: (v: any) => save({ data: v }), onSuccess: () => { setEditing(null); invalidate(); } });
  const mDel = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: invalidate });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Articles &amp; Blog</h1>
          <p className="text-sm text-muted-foreground">Publish real guides, tips and news. Draft articles remain hidden from the public site.</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setEditing({ ...empty })}>+ New article</button>
      </div>

      {q.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
        (q.data ?? []).length === 0 ? (
          <div className="rounded-lg border border-border bg-white p-8 text-center text-sm text-muted-foreground">No articles yet. Write your first article to open the blog on the site.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3 text-left">Title</th><th className="p-3 text-left">Slug</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
              <tbody>
                {q.data!.map((a: any) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-3 font-medium">{a.title}</td>
                    <td className="p-3 text-muted-foreground">/{a.slug}</td>
                    <td className="p-3 text-center">{a.published ? <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">Published</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Draft</span>}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <button className="rounded p-1 hover:bg-muted" onClick={() => mSave.mutate({ id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt, body_md: a.body_md, cover_image_path: a.cover_image_path, tags: a.tags, seo_title: a.seo_title, seo_description: a.seo_description, display_order: a.display_order, published: !a.published })} title={a.published ? "Unpublish" : "Publish"}>{a.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                        <button className="rounded p-1 hover:bg-muted" onClick={() => setEditing(a)} title="Edit"><Pencil className="h-4 w-4" /></button>
                        <button className="rounded p-1 hover:bg-muted text-red-600" onClick={() => { if (confirm("Delete this article?")) mDel.mutate(a.id); }} title="Delete"><Trash2 className="h-4 w-4" /></button>
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
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg mb-3">{editing.id ? "Edit article" : "New article"}</h2>
            <div className="space-y-3">
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Title</span><input className="w-full h-9 rounded-md border border-border px-3" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Slug (optional — auto from title)</span><input className="w-full h-9 rounded-md border border-border px-3" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="my-article" /></label>
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Excerpt</span><textarea className="w-full min-h-[60px] rounded-md border border-border px-3 py-2" value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} /></label>
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Body (Markdown)</span><textarea className="w-full min-h-[200px] rounded-md border border-border px-3 py-2 font-mono text-xs" value={editing.body_md ?? ""} onChange={(e) => setEditing({ ...editing, body_md: e.target.value })} /></label>
              <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Tags (comma-separated)</span><input className="w-full h-9 rounded-md border border-border px-3" value={(editing.tags ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} /></label>
              <div className="grid grid-cols-1 gap-3">
                <label className="block text-sm"><span className="mb-1 block text-muted-foreground">SEO title</span><input className="w-full h-9 rounded-md border border-border px-3" value={editing.seo_title ?? ""} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} /></label>
                <label className="block text-sm"><span className="mb-1 block text-muted-foreground">SEO description</span><textarea className="w-full min-h-[60px] rounded-md border border-border px-3 py-2" value={editing.seo_description ?? ""} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} /></label>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="accent-primary" /> Published</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary text-sm" disabled={mSave.isPending || !editing.title} onClick={() => mSave.mutate(editing)}>{mSave.isPending ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
