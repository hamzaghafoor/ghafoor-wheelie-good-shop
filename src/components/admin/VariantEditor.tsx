import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { upsertVariant, upsertModel } from "@/lib/catalogue.functions";
import { AVAILABILITY_STATUSES, PRICE_MODES } from "@/lib/tyre-sizes";
import { VariantCompatManager } from "./VariantCompatManager";


export function VariantEditor({ variant, model, brand }: { variant: any; model: any; brand: any }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const upVar = useServerFn(upsertVariant);
  const [v, setV] = useState<any>(variant);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  const save = useMutation({
    mutationFn: (status: "draft" | "published") => upVar({ data: { ...v, status } }),
    onSuccess: (_r, status) => { qc.invalidateQueries({ queryKey: ["adm-cat"] }); setMsg({ ok: `Saved as ${status}.` }); setTimeout(() => navigate({ to: "/admin/tyres" }), 500); },
    onError: (e: any) => setMsg({ err: e.message }),
  });

  return (
    <div className="max-w-2xl">
      <div className="text-xs text-muted-foreground">{brand.name} › {model.name}</div>
      <h1 className="mt-1 font-display text-2xl">{v.normalized_size}</h1>

      <div className="mt-6 space-y-4">
        <Field label="Normalized size"><input value={v.normalized_size} onChange={(e) => setV({ ...v, normalized_size: e.target.value })} className={inp} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price mode">
            <select value={v.price_mode} onChange={(e) => setV({ ...v, price_mode: e.target.value })} className={inp}>
              {PRICE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Availability">
            <select value={v.availability} onChange={(e) => setV({ ...v, availability: e.target.value })} className={inp}>
              {AVAILABILITY_STATUSES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </Field>
          <Field label="Price"><input type="number" value={v.price ?? ""} onChange={(e) => setV({ ...v, price: e.target.value ? Number(e.target.value) : null })} className={inp} /></Field>
          <Field label="Previous price"><input type="number" value={v.previous_price ?? ""} onChange={(e) => setV({ ...v, previous_price: e.target.value ? Number(e.target.value) : null })} className={inp} /></Field>
          <Field label="Load index"><input value={v.load_index ?? ""} onChange={(e) => setV({ ...v, load_index: e.target.value })} className={inp} /></Field>
          <Field label="Speed rating"><input value={v.speed_rating ?? ""} onChange={(e) => setV({ ...v, speed_rating: e.target.value })} className={inp} /></Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.tubeless} onChange={(e) => setV({ ...v, tubeless: e.target.checked })} className="accent-primary" /> Tubeless</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.run_flat} onChange={(e) => setV({ ...v, run_flat: e.target.checked })} className="accent-primary" /> Run-flat</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.xl_reinforced} onChange={(e) => setV({ ...v, xl_reinforced: e.target.checked })} className="accent-primary" /> XL / Reinforced</label>
        </div>
        <Field label="Public notes"><textarea rows={2} value={v.public_notes ?? ""} onChange={(e) => setV({ ...v, public_notes: e.target.value })} className={inp} /></Field>
        <Field label="Private admin notes"><textarea rows={2} value={v.private_notes ?? ""} onChange={(e) => setV({ ...v, private_notes: e.target.value })} className={inp} /></Field>

        {msg.err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
        {msg.ok && <div className="rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}

        <div className="flex gap-2 pt-2">
          <button disabled={save.isPending} onClick={() => save.mutate("draft")} className="btn-outline text-sm">Save Draft</button>
          <button disabled={save.isPending} onClick={() => save.mutate("published")} className="btn-primary text-sm">Save & Publish</button>
          <button onClick={() => navigate({ to: "/admin/tyres" })} className="ml-auto text-xs text-muted-foreground hover:text-ink">Cancel</button>
        </div>
      </div>

      {v.id && <VariantCompatManager variantId={v.id} variantSize={v.normalized_size} />}
    </div>
  );
}


const inp = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>;
}
