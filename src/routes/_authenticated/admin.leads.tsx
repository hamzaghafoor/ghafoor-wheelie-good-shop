import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLeads, updateLead } from "@/lib/leads.functions";
import { business } from "@/lib/business";
import { Phone, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  component: LeadsPage,
});

const STATUSES = ["new","contacted","qualified","closed","lost"] as const;

function LeadsPage() {
  const [status, setStatus] = useState<string>("");
  const list = useServerFn(listLeads);
  const upd = useServerFn(updateLead);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["adm-leads", status], queryFn: () => list({ data: { status: status || undefined } }) });
  const mUpd = useMutation({
    mutationFn: (v: any) => upd({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-leads"] }),
  });

  return (
    <div>
      <h1 className="font-display text-2xl">Leads & Enquiries</h1>
      <p className="text-sm text-muted-foreground">Customer enquiries from the website and chatbot.</p>

      <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
        <button onClick={() => setStatus("")} className={`rounded-full border px-3 py-1 ${status === "" ? "border-ink bg-ink text-white" : "border-border"}`}>All</button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 capitalize ${status === s ? "border-ink bg-ink text-white" : "border-border"}`}>{s}</button>
        ))}
      </div>

      <div className="mt-4 card-surface bg-white overflow-x-auto">
        {q.isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div> :
         (q.data ?? []).length === 0 ? <div className="p-6 text-sm text-muted-foreground">No leads yet.</div> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr><th className="p-3">When</th><th className="p-3">Customer</th><th className="p-3">Looking for</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((l: any) => (
                <tr key={l.id} className="border-b border-border/50 align-top">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.phone}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">{l.preferred_contact}</div>
                  </td>
                  <td className="p-3 text-xs">
                    {l.tyre_size && <div>Size: <b>{l.tyre_size}</b></div>}
                    {(l.vehicle_make || l.vehicle_model) && <div>Vehicle: <b>{[l.vehicle_make, l.vehicle_model, l.vehicle_year].filter(Boolean).join(" ")}</b></div>}
                    {l.message && <div className="mt-1 text-muted-foreground line-clamp-3">{l.message}</div>}
                    {l.source_page && <div className="mt-1 text-[10px] text-muted-foreground">From: {l.source_page}</div>}
                  </td>
                  <td className="p-3">
                    <select value={l.status} onChange={(e) => mUpd.mutate({ id: l.id, status: e.target.value })} className="h-8 rounded-md border border-border bg-white px-2 text-xs capitalize">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <a href={`https://wa.me/${l.phone.replace(/\D/g,"")}?text=${encodeURIComponent(`Assalam-o-Alaikum ${l.name}, this is ${business.name}. `)}`} target="_blank" rel="noreferrer" className="rounded-md bg-success/10 p-1.5 text-success" title="WhatsApp"><MessageCircle className="h-4 w-4" /></a>
                      <a href={`tel:${l.phone}`} className="rounded-md bg-primary/10 p-1.5 text-primary" title="Call"><Phone className="h-4 w-4" /></a>
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
