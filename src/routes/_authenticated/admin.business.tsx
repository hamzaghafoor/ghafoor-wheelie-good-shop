import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { getBusinessInfo, updateBusinessInfo } from "@/lib/business.functions";

export const Route = createFileRoute("/_authenticated/admin/business")({
  component: BusinessPage,
});

function BusinessPage() {
  const qc = useQueryClient();
  const fetchBiz = useServerFn(getBusinessInfo);
  const save = useServerFn(updateBusinessInfo);
  const q = useQuery({ queryKey: ["adm-biz"], queryFn: () => fetchBiz() });
  const [f, setF] = useState<any>({});
  const [hoursText, setHoursText] = useState("{}");
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  useEffect(() => {
    if (q.data) {
      setF(q.data);
      setHoursText(JSON.stringify(q.data.hours ?? {}, null, 2));
    }
  }, [q.data]);

  const mut = useMutation({
    mutationFn: () => {
      let hrs: any = {}; try { hrs = JSON.parse(hoursText); } catch { throw new Error("Hours JSON invalid"); }
      return save({ data: { ...f, hours: hrs, holiday_hours: f.holiday_hours ?? {}, currency: f.currency || "PKR", timezone: f.timezone || "Asia/Karachi" } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adm-biz"] }); setMsg({ ok: "Saved." }); },
    onError: (e: any) => setMsg({ err: e.message }),
  });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl">Business Information</h1>
      <p className="mt-1 text-sm text-muted-foreground">The single source of truth for your name, contact details, hours and social links.</p>

      <div className="mt-6 space-y-4">
        <Field label="Business name"><input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inp} /></Field>
          <Field label="WhatsApp (E.164, no +)"><input value={f.whatsapp ?? ""} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} className={inp} /></Field>
          <Field label="Email"><input value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} className={inp} /></Field>
          <Field label="Google Maps URL"><input value={f.maps_url ?? ""} onChange={(e) => setF({ ...f, maps_url: e.target.value })} className={inp} /></Field>
        </div>
        <Field label="Address"><textarea rows={2} value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} className={inp} /></Field>
        <Field label="Hours (JSON)"><textarea rows={8} value={hoursText} onChange={(e) => setHoursText(e.target.value)} className={`${inp} font-mono text-xs h-auto`} /></Field>
        <Field label="Temporary closure banner (optional)"><input value={f.temp_closure ?? ""} onChange={(e) => setF({ ...f, temp_closure: e.target.value })} className={inp} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Facebook URL"><input value={f.facebook ?? ""} onChange={(e) => setF({ ...f, facebook: e.target.value })} className={inp} /></Field>
          <Field label="Instagram URL"><input value={f.instagram ?? ""} onChange={(e) => setF({ ...f, instagram: e.target.value })} className={inp} /></Field>
          <Field label="Google review URL"><input value={f.google_review_url ?? ""} onChange={(e) => setF({ ...f, google_review_url: e.target.value })} className={inp} /></Field>
          <Field label="Currency"><input value={f.currency ?? "PKR"} onChange={(e) => setF({ ...f, currency: e.target.value })} className={inp} /></Field>
        </div>

        {msg.err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
        {msg.ok && <div className="rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}

        <button disabled={mut.isPending} onClick={() => mut.mutate()} className="btn-primary text-sm">{mut.isPending ? "Saving…" : "Save changes"}</button>
      </div>
    </div>
  );
}

const inp = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>;
}
