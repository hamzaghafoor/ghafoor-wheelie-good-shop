import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getCatalogueSettings, updateCatalogueSettings, listLookups, upsertPackagingPreset, deletePackagingPreset, updateUnitVisibility } from "@/lib/catalogue-cms.functions";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/catalogue/settings")({
  component: SettingsPage,
});

const CATS = ["tyres","lubricants","filters","maintenance_parts","car_care","additives","accessories","services"] as const;
const AVAIL = ["in_stock","limited","check","out_of_stock","on_order","discontinued"] as const;
const inp = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm";

function SettingsPage() {
  const qc = useQueryClient();
  const get = useServerFn(getCatalogueSettings);
  const upd = useServerFn(updateCatalogueSettings);
  const looks = useServerFn(listLookups);
  const upPreset = useServerFn(upsertPackagingPreset);
  const delPreset = useServerFn(deletePackagingPreset);
  const updUnit = useServerFn(updateUnitVisibility);

  const settings = useQuery({ queryKey: ["cat-settings"], queryFn: () => get() });
  const lookups = useQuery({ queryKey: ["cat-lookups"], queryFn: () => looks() });

  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  useEffect(() => { if (settings.data) setS(settings.data); }, [settings.data]);

  const save = useMutation({
    mutationFn: () => upd({ data: { default_availability: s.default_availability, default_import_status: s.default_import_status, products_per_page: s.products_per_page, whatsapp_cta_text: s.whatsapp_cta_text, empty_catalogue_message: s.empty_catalogue_message, price_confirm_text: s.price_confirm_text, catalogue_phone: s.catalogue_phone ?? null, nav_categories: s.nav_categories, category_order: s.category_order, booking_enabled: !!s.booking_enabled, default_calendly_url: (s.default_calendly_url ?? "") || null, service_calendly_links: Object.fromEntries(Object.entries(s.service_calendly_links ?? {}).filter(([, v]) => typeof v === "string" && (v as string).trim() !== "")) } }),
    onSuccess: () => { setMsg({ ok: "Saved." }); qc.invalidateQueries({ queryKey: ["cat-settings"] }); },
    onError: (e: any) => setMsg({ err: e.message }),
  });

  const [newPreset, setNewPreset] = useState({ value_numeric: "", unit_code: "L", display_label: "" });
  const mUpPreset = useMutation({ mutationFn: (v: any) => upPreset({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["cat-lookups"] }) });
  const mDelPreset = useMutation({ mutationFn: (v: any) => delPreset({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["cat-lookups"] }) });
  const mUpdUnit = useMutation({ mutationFn: (v: any) => updUnit({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["cat-lookups"] }) });

  if (!s) return <div className="text-sm text-muted-foreground">Loading…</div>;

  function toggleCat(list: string[], c: string) { return list.includes(c) ? list.filter((x) => x !== c) : [...list, c]; }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-white p-4 space-y-3">
        <h2 className="font-display text-lg">General settings</h2>
        <label className="block text-sm"><span className="mb-1 block font-medium">Default availability</span>
          <select value={s.default_availability} onChange={(e) => setS({ ...s, default_availability: e.target.value })} className={inp}>{AVAIL.map((a) => <option key={a} value={a}>{a.replace(/_/g," ")}</option>)}</select>
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium">Default status for imported products</span>
          <select value={s.default_import_status} onChange={(e) => setS({ ...s, default_import_status: e.target.value })} className={inp}>
            <option value="draft">Draft</option><option value="published">Published</option>
          </select>
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium">Products per page</span>
          <input type="number" min={6} max={96} value={s.products_per_page} onChange={(e) => setS({ ...s, products_per_page: Number(e.target.value) })} className={inp} />
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium">WhatsApp CTA text</span>
          <input value={s.whatsapp_cta_text} onChange={(e) => setS({ ...s, whatsapp_cta_text: e.target.value })} className={inp} />
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium">"Contact for today's price" text</span>
          <input value={s.price_confirm_text} onChange={(e) => setS({ ...s, price_confirm_text: e.target.value })} className={inp} />
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium">Empty catalogue message</span>
          <textarea rows={2} value={s.empty_catalogue_message} onChange={(e) => setS({ ...s, empty_catalogue_message: e.target.value })} className="w-full rounded-md border border-border bg-white p-3 text-sm" />
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium">Catalogue phone (optional)</span>
          <input value={s.catalogue_phone ?? ""} onChange={(e) => setS({ ...s, catalogue_phone: e.target.value })} className={inp} />
        </label>

        <div>
          <div className="mb-1 text-sm font-medium">Categories visible in navigation</div>
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => {
              const on = s.nav_categories.includes(c);
              return <button key={c} type="button" onClick={() => setS({ ...s, nav_categories: toggleCat(s.nav_categories, c) })} className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{c.replace(/_/g," ")}</button>;
            })}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-2/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base">Booking (Calendly)</h3>
            <label className="text-xs"><input type="checkbox" checked={!!s.booking_enabled} onChange={(e) => setS({ ...s, booking_enabled: e.target.checked })} className="accent-primary" /> Enabled</label>
          </div>
          <label className="block text-sm"><span className="mb-1 block font-medium">Default Calendly URL</span>
            <input value={s.default_calendly_url ?? ""} placeholder="https://calendly.com/your-handle/appointment" onChange={(e) => setS({ ...s, default_calendly_url: e.target.value })} className={inp} />
          </label>
          <div>
            <div className="mb-1 text-sm font-medium">Service-specific links (optional)</div>
            <div className="space-y-1.5">
              {SERVICE_KEYS.map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-24 text-xs text-muted-foreground capitalize">{k}</span>
                  <input value={(s.service_calendly_links ?? {})[k] ?? ""} placeholder="https://calendly.com/..." onChange={(e) => setS({ ...s, service_calendly_links: { ...(s.service_calendly_links ?? {}), [k]: e.target.value } })} className={inp} />
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Leave blank to use the default URL. If booking is disabled or no URL is set, the Book button is hidden.</p>
          </div>
        </div>

        {msg.err && <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{msg.err}</div>}
        {msg.ok && <div className="rounded-md bg-green-50 p-2 text-sm text-green-700">{msg.ok}</div>}
        <button disabled={save.isPending} onClick={() => save.mutate()} className="btn-primary text-sm">Save settings</button>

      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-white p-4">
          <h2 className="font-display text-lg">Packaging presets</h2>
          <p className="mt-1 text-xs text-muted-foreground">Speeds up variant entry. Admin can still enter any custom value.</p>
          <div className="mt-3 space-y-1">
            {(lookups.data?.presets ?? []).map((p: any) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <input type="number" step="0.01" defaultValue={p.value_numeric} onBlur={(e) => mUpPreset.mutate({ id: p.id, value_numeric: Number(e.target.value), unit_code: p.unit_code, display_label: p.display_label, display_order: p.display_order, is_active: p.is_active })} className="h-8 w-20 rounded-md border border-border px-2 text-sm" />
                <select defaultValue={p.unit_code} onChange={(e) => mUpPreset.mutate({ id: p.id, value_numeric: Number(p.value_numeric), unit_code: e.target.value, display_label: p.display_label, display_order: p.display_order, is_active: p.is_active })} className="h-8 rounded-md border border-border px-1 text-sm">
                  {(lookups.data?.units ?? []).map((u: any) => <option key={u.code} value={u.code}>{u.display_label}</option>)}
                </select>
                <input defaultValue={p.display_label ?? ""} placeholder="Label" onBlur={(e) => mUpPreset.mutate({ id: p.id, value_numeric: Number(p.value_numeric), unit_code: p.unit_code, display_label: e.target.value, display_order: p.display_order, is_active: p.is_active })} className="h-8 flex-1 rounded-md border border-border px-2 text-sm" />
                <label className="text-xs"><input type="checkbox" defaultChecked={p.is_active} onChange={(e) => mUpPreset.mutate({ id: p.id, value_numeric: Number(p.value_numeric), unit_code: p.unit_code, display_label: p.display_label, display_order: p.display_order, is_active: e.target.checked })} className="accent-primary" /> active</label>
                <button onClick={() => { if (confirm("Delete preset?")) mDelPreset.mutate({ id: p.id }); }} className="rounded p-1 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
            <input type="number" step="0.01" placeholder="Value" value={newPreset.value_numeric} onChange={(e) => setNewPreset({ ...newPreset, value_numeric: e.target.value })} className="h-8 w-24 rounded-md border border-border px-2 text-sm" />
            <select value={newPreset.unit_code} onChange={(e) => setNewPreset({ ...newPreset, unit_code: e.target.value })} className="h-8 rounded-md border border-border px-1 text-sm">
              {(lookups.data?.units ?? []).map((u: any) => <option key={u.code} value={u.code}>{u.display_label}</option>)}
            </select>
            <input placeholder="Label (optional)" value={newPreset.display_label} onChange={(e) => setNewPreset({ ...newPreset, display_label: e.target.value })} className="h-8 flex-1 rounded-md border border-border px-2 text-sm" />
            <button onClick={() => { const v = Number(newPreset.value_numeric); if (!v || v <= 0) return; mUpPreset.mutate({ value_numeric: v, unit_code: newPreset.unit_code, display_label: newPreset.display_label || null, display_order: 0, is_active: true }); setNewPreset({ value_numeric: "", unit_code: newPreset.unit_code, display_label: "" }); }} className="btn-primary text-xs flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-4">
          <h2 className="font-display text-lg">Measurement units</h2>
          <p className="mt-1 text-xs text-muted-foreground">Core units are system-controlled — conversions (L↔ml, kg↔g) cannot be changed. You may hide unused units or change how they display.</p>
          <div className="mt-3 space-y-1">
            {(lookups.data?.units ?? []).map((u: any) => (
              <div key={u.code} className="flex items-center gap-2 text-sm">
                <code className="w-16 text-xs">{u.code}</code>
                <input defaultValue={u.display_label} onBlur={(e) => e.target.value !== u.display_label && mUpdUnit.mutate({ code: u.code, display_label: e.target.value })} className="h-8 w-24 rounded-md border border-border px-2 text-sm" />
                <span className="text-xs text-muted-foreground">{u.kind} · 1{u.code} = {u.factor_to_base} {u.base_code}</span>
                <label className="ml-auto text-xs"><input type="checkbox" defaultChecked={u.is_visible} onChange={(e) => mUpdUnit.mutate({ code: u.code, is_visible: e.target.checked })} className="accent-primary" /> visible</label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
