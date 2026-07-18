import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAllTyresAdmin, setTyreStatusAdmin } from "@/lib/tyres.functions";

export const Route = createFileRoute("/_authenticated/admin/tyres/")({
  component: TyresList,
});

type StatusFilter = "all" | "draft" | "published" | "archived";

function TyresList() {
  const fetchAll = useServerFn(listAllTyresAdmin);
  const setStatus = useServerFn(setTyreStatusAdmin);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin-tyres"], queryFn: () => fetchAll() });

  const mut = useMutation({
    mutationFn: async (v: { id: string; status: "draft" | "published" | "archived" }) =>
      setStatus({ data: v }),
    onSuccess: (res, v) => {
      setNotice(`Status changed to ${v.status}.`);
      qc.invalidateQueries({ queryKey: ["admin-tyres"] });
      qc.invalidateQueries({ queryKey: ["admin-tyres-summary"] });
    },
    onError: (e: any) => setNotice(`Error: ${e.message}`),
  });

  const rows = (data ?? []).filter((t: any) => filter === "all" || t.status === filter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Tyre products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Draft tyres are private. Only published tyres appear on the website.</p>
        </div>
        <Link to="/admin/tyres/new" className="btn-primary text-sm">+ Add new tyre</Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", "published", "draft", "archived"] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${filter === s ? "border-primary bg-primary text-white" : "border-border bg-white"}`}>
            {s}
          </button>
        ))}
      </div>

      {notice && <div className="mt-4 rounded-md bg-blue-50 p-2.5 text-sm text-blue-700">{notice}</div>}

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No tyres yet. <Link to="/admin/tyres/new" className="text-primary underline">Add your first tyre</Link>.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Image</th>
                <th className="px-3 py-2">Brand / Model</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t: any) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    {t.image_signed_url ? (
                      <img src={t.image_signed_url} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted" />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{t.brand}</div>
                    <div className="text-xs text-muted-foreground">{t.model}</div>
                  </td>
                  <td className="px-3 py-2">{t.size}</td>
                  <td className="px-3 py-2">{t.price ? `${t.currency} ${t.price}` : "—"}</td>
                  <td className="px-3 py-2">{t.in_stock ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                      t.status === "published" ? "bg-green-100 text-green-700"
                      : t.status === "draft" ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-200 text-gray-700"
                    }`}>{t.status}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Link to="/admin/tyres/$id" params={{ id: t.id }} className="rounded border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary">Edit</Link>
                      {t.status !== "published" && (
                        <button onClick={() => mut.mutate({ id: t.id, status: "published" })}
                          className="rounded border border-green-600 px-2 py-1 text-xs text-green-700 hover:bg-green-50">Publish</button>
                      )}
                      {t.status === "published" && (
                        <button onClick={() => mut.mutate({ id: t.id, status: "draft" })}
                          className="rounded border border-yellow-600 px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-50">Unpublish</button>
                      )}
                      {t.status !== "archived" && (
                        <button onClick={() => mut.mutate({ id: t.id, status: "archived" })}
                          className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:border-red-500 hover:text-red-600">Archive</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
