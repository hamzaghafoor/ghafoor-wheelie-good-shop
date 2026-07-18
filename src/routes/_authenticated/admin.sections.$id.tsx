import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { getSectionAdmin, upsertSection } from "@/lib/sections.functions";
import { listBrandsAdmin } from "@/lib/brands.functions";
import { listCatalogueAdmin } from "@/lib/catalogue.functions";

export const Route = createFileRoute("/_authenticated/admin/sections/$id")({
  component: SectionEditor,
});

const inp = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm";
const ta = "w-full rounded-md border border-border bg-white p-3 text-sm";
const BG_OPTIONS = [
  { value: "white", label: "White" },
  { value: "off-white", label: "Off-White" },
  { value: "black", label: "Black" },
  { value: "charcoal", label: "Charcoal" },
  { value: "orange-accent", label: "Orange Accent" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function SectionEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOne = useServerFn(getSectionAdmin);
  const upsert = useServerFn(upsertSection);

  const q = useQuery({ queryKey: ["adm-section", id], queryFn: () => fetchOne({ data: { id } }) });
  const [name, setName] = useState("");
  const [config, setConfig] = useState<any>({});
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (q.data) {
      setName(q.data.name);
      setConfig(q.data.config ?? {});
      setDirty(false);
    }
  }, [q.data]);

  const update = (patch: any) => { setConfig((c: any) => ({ ...c, ...patch })); setDirty(true); };

  const save = useMutation({
    mutationFn: (status: "draft" | "published") =>
      upsert({ data: { id, type: q.data!.type, name, config, display_order: q.data!.display_order ?? 0, is_visible: q.data!.is_visible ?? true, status } }),
    onSuccess: (_r, status) => {
      qc.invalidateQueries({ queryKey: ["adm-sections"] });
      qc.invalidateQueries({ queryKey: ["adm-section", id] });
      qc.invalidateQueries({ queryKey: ["public-sections"] });
      setDirty(false);
      setMsg({ ok: status === "published" ? "Published. Live site updated." : "Draft saved. Public site unchanged." });
    },
    onError: (e: any) => setMsg({ err: e.message }),
  });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (q.error || !q.data) return <div className="text-sm text-red-600">Section not found.</div>;
  const s = q.data;

  return (
    <div className="max-w-3xl">
      <button onClick={() => { if (!dirty || confirm("You have unsaved changes. Discard?")) navigate({ to: "/admin/sections" }); }} className="text-xs text-muted-foreground hover:text-ink">← Back to sections</button>
      <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Section · {s.type.replace(/_/g, " ")}</div>
      <h1 className="mt-1 font-display text-2xl">{s.name}</h1>

      <div className="mt-6 space-y-4">
        <Field label="Internal section name" hint="Only visible in the admin.">
          <input value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} className={inp} />
        </Field>

        <div className="border-t border-border pt-4">
          <TypedFields type={s.type} config={config} update={update} />
        </div>

        {msg.err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
        {msg.ok && <div className="rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}

        <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-2 border-t border-border bg-white/95 px-4 py-3 backdrop-blur">
          <button disabled={save.isPending} onClick={() => save.mutate("draft")} className="btn-outline text-sm">Save Draft</button>
          <a href="/?preview=1" target="_blank" rel="noreferrer" className="btn-outline text-sm">Preview Homepage</a>
          <button disabled={save.isPending} onClick={() => save.mutate("published")} className="btn-primary text-sm">
            {save.isPending ? "Saving…" : "Publish"}
          </button>
          {dirty && <span className="ml-auto self-center text-xs text-amber-700">Unsaved changes</span>}
        </div>
      </div>
    </div>
  );
}

function TypedFields({ type, config, update }: { type: string; config: any; update: (p: any) => void }) {
  switch (type) {
    case "hero": return <HeroFields c={config} u={update} />;
    case "featured_brands": return <FeaturedBrandsFields c={config} u={update} />;
    case "featured_tyres": return <FeaturedTyresFields c={config} u={update} />;
    case "trust_strip":
    case "tyre_finder":
    case "vehicle_categories":
    case "services_grid":
    case "why_us":
    case "reviews":
    case "articles":
    case "location":
      return <SimpleTextFields c={config} u={update} hint="This section uses your Business Information and site design. Edit heading/subtitle only." />;
    default:
      return <SimpleTextFields c={config} u={update} />;
  }
}

function SimpleTextFields({ c, u, hint }: { c: any; u: (p: any) => void; hint?: string }) {
  return (
    <div className="space-y-4">
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Field label="Eyebrow (small label above heading)"><input value={c.eyebrow ?? ""} onChange={(e) => u({ eyebrow: e.target.value })} className={inp} /></Field>
      <Field label="Heading"><input value={c.heading ?? c.title ?? ""} onChange={(e) => u({ heading: e.target.value })} className={inp} /></Field>
      <Field label="Subtitle / description"><textarea rows={3} value={c.subtitle ?? c.description ?? ""} onChange={(e) => u({ subtitle: e.target.value })} className={ta} /></Field>
    </div>
  );
}

function HeroFields({ c, u }: { c: any; u: (p: any) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Eyebrow"><input value={c.eyebrow ?? ""} onChange={(e) => u({ eyebrow: e.target.value })} className={inp} placeholder="Tyres • Lubricants • Wheel Care" /></Field>
      <Field label="Heading (line 1)"><input value={c.heading_line1 ?? ""} onChange={(e) => u({ heading_line1: e.target.value })} className={inp} placeholder="The Right Tyres for a" /></Field>
      <Field label="Heading (line 2)" hint="This line uses the orange accent."><input value={c.heading_line2 ?? ""} onChange={(e) => u({ heading_line2: e.target.value })} className={inp} placeholder="Safer, Smoother Drive." /></Field>
      <Field label="Description"><textarea rows={3} value={c.description ?? ""} onChange={(e) => u({ description: e.target.value })} className={ta} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Primary CTA label"><input value={c.primary_cta_label ?? ""} onChange={(e) => u({ primary_cta_label: e.target.value })} className={inp} placeholder="Find Tyres for My Car" /></Field>
        <Field label="Primary CTA link"><input value={c.primary_cta_href ?? ""} onChange={(e) => u({ primary_cta_href: e.target.value })} className={inp} placeholder="/tyres" /></Field>
        <Field label="Secondary CTA label"><input value={c.secondary_cta_label ?? ""} onChange={(e) => u({ secondary_cta_label: e.target.value })} className={inp} placeholder="WhatsApp for Today's Price" /></Field>
        <Field label="Secondary CTA WhatsApp message"><input value={c.secondary_cta_wa ?? ""} onChange={(e) => u({ secondary_cta_wa: e.target.value })} className={inp} placeholder="Assalam-o-Alaikum, please share today's price…" /></Field>
      </div>
      <Field label="Trust line (below CTAs)"><input value={c.trust_line ?? ""} onChange={(e) => u({ trust_line: e.target.value })} className={inp} placeholder="Expert guidance • Professional fitting • Convenient Karachi location" /></Field>
    </div>
  );
}

function FeaturedBrandsFields({ c, u }: { c: any; u: (p: any) => void }) {
  const list = useServerFn(listBrandsAdmin);
  const { data: brands } = useQuery({ queryKey: ["adm-brands"], queryFn: () => list() });
  const selected: string[] = c.brand_ids ?? [];
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    u({ brand_ids: next });
  };
  const mode = c.mode ?? "featured";
  return (
    <div className="space-y-4">
      <Field label="Heading"><input value={c.heading ?? ""} onChange={(e) => u({ heading: e.target.value })} className={inp} placeholder="Trusted Brands We Stock" /></Field>
      <Field label="Subtitle"><textarea rows={2} value={c.subtitle ?? ""} onChange={(e) => u({ subtitle: e.target.value })} className={ta} /></Field>
      <Field label="Selection mode">
        <select value={mode} onChange={(e) => u({ mode: e.target.value })} className={inp}>
          <option value="featured">Automatic – show all brands marked "Featured"</option>
          <option value="manual">Manual – choose brands below</option>
        </select>
      </Field>
      <Field label={mode === "manual" ? "Selected brands" : "Featured brands preview"}>
        <div className="rounded-md border border-border bg-white p-2 max-h-64 overflow-y-auto">
          {(brands ?? []).length === 0 && <div className="p-2 text-xs text-muted-foreground">No brands yet. Add brands in Catalogue → Brands.</div>}
          {(brands ?? []).map((b: any) => (
            <label key={b.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50">
              <input type="checkbox" disabled={mode !== "manual"} checked={mode === "manual" ? selected.includes(b.id) : !!b.is_featured} onChange={() => toggle(b.id)} />
              <span className="flex-1">{b.name}</span>
              {b.is_featured && <span className="text-[10px] uppercase text-amber-700">Featured</span>}
              {!b.is_active && <span className="text-[10px] uppercase text-muted-foreground">Inactive</span>}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Max brands to display"><input type="number" min={1} max={20} value={c.max ?? 8} onChange={(e) => u({ max: Number(e.target.value) })} className={inp} /></Field>
    </div>
  );
}

function FeaturedTyresFields({ c, u }: { c: any; u: (p: any) => void }) {
  const list = useServerFn(listCatalogueAdmin);
  const { data } = useQuery({ queryKey: ["adm-cat"], queryFn: () => list() });
  const models = (data?.models ?? []).filter((m: any) => m.status === "published");
  const brandName = (id: string) => (data?.brands ?? []).find((b: any) => b.id === id)?.name ?? "";
  const selected: string[] = c.model_ids ?? [];
  const toggle = (id: string) => u({ model_ids: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id] });
  const mode = c.mode ?? "featured";
  return (
    <div className="space-y-4">
      <Field label="Heading"><input value={c.heading ?? ""} onChange={(e) => u({ heading: e.target.value })} className={inp} placeholder="Popular Tyre Options" /></Field>
      <Field label="Subtitle"><textarea rows={2} value={c.subtitle ?? ""} onChange={(e) => u({ subtitle: e.target.value })} className={ta} /></Field>
      <Field label="Selection mode">
        <select value={mode} onChange={(e) => u({ mode: e.target.value })} className={inp}>
          <option value="featured">Automatic – show tyres marked "Featured"</option>
          <option value="manual">Manual – choose tyres below</option>
        </select>
      </Field>
      <Field label="Number of tyres to show"><input type="number" min={1} max={12} value={c.max ?? 6} onChange={(e) => u({ max: Number(e.target.value) })} className={inp} /></Field>
      <Field label="Only show in-stock">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!c.in_stock_only} onChange={(e) => u({ in_stock_only: e.target.checked })} /> Hide out-of-stock models</label>
      </Field>
      {mode === "manual" && (
        <Field label="Choose tyres (published only)">
          <div className="rounded-md border border-border bg-white p-2 max-h-72 overflow-y-auto">
            {models.length === 0 && <div className="p-2 text-xs text-muted-foreground">No published tyres yet.</div>}
            {models.map((m: any) => (
              <label key={m.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50">
                <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                <span className="flex-1">{brandName(m.brand_id)} — {m.name}</span>
              </label>
            ))}
          </div>
        </Field>
      )}
      <Field label="CTA label (link to /tyres)"><input value={c.cta_label ?? ""} onChange={(e) => u({ cta_label: e.target.value })} className={inp} placeholder="View tyre catalogue" /></Field>
    </div>
  );
}
