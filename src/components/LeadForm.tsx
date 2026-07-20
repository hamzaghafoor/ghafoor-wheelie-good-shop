import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { submitLead } from "@/lib/leads.functions";
import { track } from "@/lib/analytics";
import { CheckCircle2 } from "lucide-react";

type Props = {
  tyre_size?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  variant_id?: string;
  model_id?: string;
  search_context?: Record<string, any>;
  compact?: boolean;
  title?: string;
  lead_type?: "general" | "tyre_no_results" | "catalogue_no_results" | "vehicle_no_match" | "callback";
  showExtended?: boolean;
};

export function LeadForm(p: Props) {
  const submit = useServerFn(submitLead);
  const [form, setForm] = useState({
    name: "", phone: "", message: "", preferred_contact: "whatsapp" as "whatsapp" | "call" | "either",
    preferred_brand: "", quantity: "", budget: "",
  });
  const [done, setDone] = useState(false);

  const m = useMutation({
    mutationFn: () => submit({ data: {
      name: form.name, phone: form.phone, preferred_contact: form.preferred_contact,
      message: [form.message, p.showExtended && form.preferred_brand ? `Preferred brand: ${form.preferred_brand}` : "",
                p.showExtended && form.quantity ? `Quantity: ${form.quantity}` : "",
                p.showExtended && form.budget ? `Budget: ${form.budget}` : ""].filter(Boolean).join(" · ") || null,
      tyre_size: p.tyre_size, vehicle_make: p.vehicle_make, vehicle_model: p.vehicle_model, vehicle_year: p.vehicle_year,
      variant_id: p.variant_id, model_id: p.model_id,
      search_context: {
        ...(p.search_context ?? {}),
        ...(p.showExtended ? { preferred_brand: form.preferred_brand || null, quantity: form.quantity || null, budget: form.budget || null } : {}),
      },
      source_page: typeof window !== "undefined" ? window.location.pathname : null,
      lead_type: p.lead_type ?? "general",
    } as any }),
    onSuccess: () => { setDone(true); track("lead_submitted", { has_size: !!p.tyre_size, has_vehicle: !!p.vehicle_make, lead_type: p.lead_type ?? "general" }); },
  });

  if (done) return (
    <div className="rounded-lg border border-success/40 bg-success/5 p-4 text-sm text-success flex items-start gap-2">
      <CheckCircle2 className="h-5 w-5 flex-none" /> <div><b>Thank you!</b> Our tyre expert will contact you shortly.</div>
    </div>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className={`space-y-3 ${p.compact ? "" : "card-surface bg-white p-5"}`}>
      {p.title && <h3 className="font-display text-lg text-ink">{p.title}</h3>}
      <div className="grid gap-3 sm:grid-cols-2">
        <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 rounded-md border border-border px-3 text-sm" />
        <input required placeholder="Phone / WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-10 rounded-md border border-border px-3 text-sm" />
      </div>
      <textarea placeholder="Anything specific? (optional)" rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-md border border-border px-3 py-2 text-sm" />
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground">Contact me on:</span>
        {(["whatsapp","call","either"] as const).map((k) => (
          <label key={k} className="flex items-center gap-1.5">
            <input type="radio" checked={form.preferred_contact === k} onChange={() => setForm({ ...form, preferred_contact: k })} className="accent-primary" />
            <span className="capitalize">{k}</span>
          </label>
        ))}
      </div>
      {m.error && <div className="text-xs text-red-600">{(m.error as Error).message}</div>}
      <button disabled={m.isPending} className="btn-primary w-full text-sm">{m.isPending ? "Sending…" : "Request a call back"}</button>
      <p className="text-[11px] text-muted-foreground">We'll only use your details to help with your tyre enquiry.</p>
    </form>
  );
}
