import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { listBrandsAdmin, upsertBrand } from "@/lib/brands.functions";
import { listCatalogueAdmin, upsertModel, upsertVariant, checkDuplicateVariant } from "@/lib/catalogue.functions";
import { supabase } from "@/integrations/supabase/client";
import { COMMON_WIDTHS, COMMON_PROFILES, COMMON_RIMS, VEHICLE_CATEGORIES, DRIVING_CHARACTERISTICS, PRICE_MODES, AVAILABILITY_STATUSES } from "@/lib/tyre-sizes";
import { normalizeMetricSize, buildMetricSize } from "@/lib/tyre-normalize";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

const STEPS = ["Brand", "Model", "Size", "Price & Availability", "Specifications", "Images", "Preview"];

export function TyreWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const brandsQ = useQuery({ queryKey: ["adm-brands"], queryFn: useServerFn(listBrandsAdmin) });
  const catQ = useQuery({ queryKey: ["adm-cat"], queryFn: useServerFn(listCatalogueAdmin) });
  const brands = (brandsQ.data ?? []).filter((b: any) => !b.archived);

  const upBrand = useServerFn(upsertBrand);
  const upModel = useServerFn(upsertModel);
  const upVariant = useServerFn(upsertVariant);
  const dupCheck = useServerFn(checkDuplicateVariant);

  const [step, setStep] = useState(0);
  const [brandId, setBrandId] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [modelName, setModelName] = useState("");
  const [modelData, setModelData] = useState<any>({ vehicle_categories: [], driving_characteristics: [], short_desc: "", full_desc: "", warranty: "", is_featured: false, internal_notes: "", tyre_type: "passenger", pattern_name: "", origin_country: "", warranty_text: "" });
  const [size, setSize] = useState({ width: "", profile: "", rim: "", format: "metric" as "metric" | "custom", custom: "" });
  const [normalized, setNormalized] = useState("");
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const [pa, setPa] = useState({ price_mode: "confirm_today", price: "", previous_price: "", price_note: "", availability: "check" });
  const [specs, setSpecs] = useState({ load_index: "", speed_rating: "", tubeless: true, run_flat: false, xl_reinforced: false, ply_rating: "", manufacturing_country: "", warranty: "", public_notes: "", private_notes: "" });
  const [images, setImages] = useState<{ main?: string; tread?: string; sidewall?: string; extras?: string[] }>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  const existingModels = useMemo(() => {
    if (!catQ.data) return [];
    return catQ.data.models.filter((m: any) => m.brand_id === brandId);
  }, [catQ.data, brandId]);

  // Auto-normalize size
  function updateSize(patch: Partial<typeof size>) {
    const next = { ...size, ...patch };
    setSize(next);
    setDupWarning(null);
    if (next.format === "metric") {
      if (next.width && next.profile && next.rim) {
        setNormalized(buildMetricSize(next.width, next.profile, next.rim));
      } else {
        setNormalized("");
      }
    } else {
      const norm = normalizeMetricSize(next.custom);
      setNormalized(norm ?? next.custom.trim());
    }
  }

  function switchFormat(format: "metric" | "custom") {
    setSize({ width: "", profile: "", rim: "", custom: "", format });
    setNormalized("");
    setDupWarning(null);
  }


  async function checkDup() {
    if (!modelId || !normalized) return;
    const res = await dupCheck({ data: { model_id: modelId, normalized_size: normalized } });
    setDupWarning(res.exists ? `A ${normalized} tyre already exists for this model.` : null);
  }

  const createBrand = useMutation({
    mutationFn: () => upBrand({ data: { name: newBrandName.trim(), is_active: true, is_featured: false, display_order: 0 } }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["adm-brands"] }); setBrandId(r.id); setShowBrandModal(false); setNewBrandName(""); },
  });

  async function uploadImage(field: "main" | "tread" | "sidewall", file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `tyres/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error } = await supabase.storage.from("tyre-images").upload(path, file);
    if (error) { setMsg({ err: error.message }); return; }
    const { data } = await supabase.storage.from("tyre-images").createSignedUrl(path, 3600);
    setImages((im) => ({ ...im, [field]: path }));
    setPreviews((p) => ({ ...p, [field]: data?.signedUrl ?? "" }));
  }

  const saveModel = useMutation({
    mutationFn: async () => {
      const imagesPayload: any = {};
      if (images.main) imagesPayload.main = { path: images.main };
      if (images.tread) imagesPayload.tread = { path: images.tread };
      if (images.sidewall) imagesPayload.sidewall = { path: images.sidewall };
      // Upsert model if not chosen from list
      let mId = modelId;
      if (!mId) {
        const res = await upModel({ data: { brand_id: brandId, name: modelName.trim(), ...modelData, images: imagesPayload, status: "draft" } });
        mId = res.id;
      } else {
        await upModel({ data: { id: mId, brand_id: brandId, name: modelName.trim(), ...modelData, images: imagesPayload, status: "draft" } });
      }
      return mId;
    },
  });

  const saveVariant = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      const mId = await saveModel.mutateAsync();
      // Publish model too if publishing variant
      if (status === "published") {
        await upModel({ data: { id: mId, brand_id: brandId, name: modelName.trim(), ...modelData, status: "published" } });
      }
      const payload: any = {
        model_id: mId,
        width: size.width ? Number(size.width) : null,
        profile: size.profile ? Number(size.profile) : null,
        rim: size.rim ? Number(size.rim) : null,
        size_format: size.format,
        normalized_size: normalized,
        price_mode: pa.price_mode as any,
        price: pa.price ? Number(pa.price) : null,
        previous_price: pa.previous_price ? Number(pa.previous_price) : null,
        price_note: pa.price_note || null,
        availability: pa.availability as any,
        load_index: specs.load_index || null,
        speed_rating: specs.speed_rating || null,
        tubeless: specs.tubeless,
        run_flat: specs.run_flat,
        xl_reinforced: specs.xl_reinforced,
        ply_rating: specs.ply_rating || null,
        manufacturing_country: specs.manufacturing_country || null,
        warranty: specs.warranty || null,
        public_notes: specs.public_notes || null,
        private_notes: specs.private_notes || null,
        status,
      };
      const res = await upVariant({ data: payload });
      return res;
    },
    onSuccess: (_r, status) => {
      qc.invalidateQueries({ queryKey: ["adm-cat"] });
      setMsg({ ok: `Tyre saved as ${status}.` });
      setTimeout(() => navigate({ to: "/admin/tyres" }), 700);
    },
    onError: (e: any) => setMsg({ err: e.message }),
  });

  const canNext = () => {
    if (step === 0) return !!brandId;
    if (step === 1) return !!modelName.trim();
    if (step === 2) return !!normalized && !dupWarning;
    return true;
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Add new tyre</h1>
        <button onClick={() => navigate({ to: "/admin/tyres" })} className="text-xs text-muted-foreground hover:text-ink">Exit</button>
      </div>

      <ol className="mt-4 flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className={`rounded-full px-3 py-1 ${i === step ? "bg-ink text-white" : i < step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}. {s}</li>
        ))}
      </ol>

      <div className="mt-6 card-surface bg-white p-6">
        {step === 0 && (
          <div>
            <h2 className="font-display text-lg">Which brand is this tyre?</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((b: any) => (
                <button key={b.id} onClick={() => setBrandId(b.id)} className={`flex items-center gap-3 rounded-lg border p-3 text-left ${brandId === b.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  {b.logo_signed_url ? <img src={b.logo_signed_url} className="h-8 w-8 rounded object-contain bg-muted" /> : <div className="h-8 w-8 rounded bg-muted" />}
                  <span className="text-sm font-medium">{b.name}</span>
                </button>
              ))}
              <button onClick={() => setShowBrandModal(true)} className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-primary hover:border-primary"><Plus className="h-4 w-4" /> Add new brand</button>
            </div>
            {showBrandModal && (
              <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setShowBrandModal(false)}>
                <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between"><h3 className="font-display text-lg">New brand</h3><button onClick={() => setShowBrandModal(false)}><X className="h-4 w-4" /></button></div>
                  <input autoFocus value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} placeholder="Brand name" className="mt-3 h-10 w-full rounded-md border border-border px-3 text-sm" />
                  <button disabled={!newBrandName.trim() || createBrand.isPending} onClick={() => createBrand.mutate()} className="btn-primary mt-3 w-full text-sm">{createBrand.isPending ? "Creating…" : "Create brand"}</button>
                  {createBrand.error && <div className="mt-2 text-xs text-red-600">{(createBrand.error as any).message}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg">Model details</h2>
            {existingModels.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Existing models for this brand:</div>
                <div className="flex flex-wrap gap-1.5">
                  {existingModels.map((m: any) => (
                    <button key={m.id} onClick={() => { setModelId(m.id); setModelName(m.name); setModelData({ vehicle_categories: m.vehicle_categories, driving_characteristics: m.driving_characteristics, short_desc: m.short_desc ?? "", full_desc: m.full_desc ?? "", warranty: m.warranty ?? "", is_featured: m.is_featured, internal_notes: m.internal_notes ?? "" }); }}
                      className={`rounded-full border px-2.5 py-1 text-xs ${modelId === m.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{m.name}</button>
                  ))}
                  <button onClick={() => { setModelId(""); setModelName(""); }} className="rounded-full border border-dashed px-2.5 py-1 text-xs text-primary">+ New model</button>
                </div>
              </div>
            )}
            <Field label="Model name *"><input value={modelName} onChange={(e) => setModelName(e.target.value)} className={inp} placeholder="e.g. Turanza T005" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pattern / tread name">
                <input value={modelData.pattern_name} onChange={(e) => setModelData({ ...modelData, pattern_name: e.target.value })} className={inp} />
              </Field>
              <Field label="Tyre type *">
                <select value={modelData.tyre_type} onChange={(e) => setModelData({ ...modelData, tyre_type: e.target.value })} className={inp}>
                  <option value="passenger">Passenger</option>
                  <option value="suv_4x4">SUV / 4x4</option>
                  <option value="commercial">Commercial</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Origin / country"><input value={modelData.origin_country} onChange={(e) => setModelData({ ...modelData, origin_country: e.target.value })} className={inp} placeholder="e.g. Japan" /></Field>
              <Field label="Warranty (short)"><input value={modelData.warranty_text} onChange={(e) => setModelData({ ...modelData, warranty_text: e.target.value })} className={inp} placeholder="e.g. 5 years" /></Field>
            </div>
            <Field label="Short description">
              <input value={modelData.short_desc} onChange={(e) => setModelData({ ...modelData, short_desc: e.target.value })} className={inp} placeholder="One sentence customers will read" />
            </Field>
            <Field label="Vehicle categories">
              <MultiPick options={VEHICLE_CATEGORIES} values={modelData.vehicle_categories} onChange={(v) => setModelData({ ...modelData, vehicle_categories: v })} />
            </Field>
            <Field label="Driving characteristics">
              <MultiPick options={DRIVING_CHARACTERISTICS} values={modelData.driving_characteristics} onChange={(v) => setModelData({ ...modelData, driving_characteristics: v })} />
            </Field>
            <Field label="Warranty (optional)"><input value={modelData.warranty} onChange={(e) => setModelData({ ...modelData, warranty: e.target.value })} className={inp} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={modelData.is_featured} onChange={(e) => setModelData({ ...modelData, is_featured: e.target.checked })} className="accent-primary" /> Featured model</label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg">Tyre size</h2>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => switchFormat("metric")} className={`rounded-full px-3 py-1 ${size.format === "metric" ? "bg-ink text-white" : "border border-border"}`}>Metric</button>
              <button type="button" onClick={() => switchFormat("custom")} className={`rounded-full px-3 py-1 ${size.format === "custom" ? "bg-ink text-white" : "border border-border"}`}>Custom / LT / other</button>
            </div>
            {size.format === "metric" ? (
              <>
                <p className="text-xs text-muted-foreground">Enter all three numbers from the sidewall, e.g. <span className="font-mono">195/65 R15</span>.</p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Width">
                    <input list="widths" inputMode="numeric" value={size.width} onChange={(e) => updateSize({ width: e.target.value.replace(/\D/g, "") })} className={inp} placeholder="195" />
                    <datalist id="widths">{COMMON_WIDTHS.map((w) => <option key={w} value={w} />)}</datalist>
                  </Field>
                  <Field label="Profile">
                    <input list="profiles" inputMode="numeric" value={size.profile} onChange={(e) => updateSize({ profile: e.target.value.replace(/\D/g, "") })} className={inp} placeholder="65" />
                    <datalist id="profiles">{COMMON_PROFILES.map((w) => <option key={w} value={w} />)}</datalist>
                  </Field>
                  <Field label="Rim">
                    <input list="rims" inputMode="numeric" value={size.rim} onChange={(e) => updateSize({ rim: e.target.value.replace(/\D/g, "") })} className={inp} placeholder="15" />
                    <datalist id="rims">{COMMON_RIMS.map((w) => <option key={w} value={w} />)}</datalist>
                  </Field>
                </div>
              </>
            ) : (
              <Field label="Size (e.g. LT265/70R17, 31x10.50R15)">
                <input value={size.custom} onChange={(e) => updateSize({ custom: e.target.value })} className={inp} placeholder="LT265/70R17" />
              </Field>
            )}
            <div className="rounded-md bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Result</div>
              <div className="font-display text-xl">
                {normalized || (size.format === "metric"
                  ? `${size.width || "…"}/${size.profile || "…"} R${size.rim || "…"}`
                  : "—")}
              </div>
              {!normalized && <div className="mt-1 text-xs text-amber-700">Fill all three fields to continue.</div>}
              <button type="button" onClick={checkDup} disabled={!modelId || !normalized} className="mt-2 text-xs text-primary hover:underline disabled:text-muted-foreground">Check for duplicate</button>
              {dupWarning && <div className="mt-2 text-xs text-red-600">{dupWarning}</div>}
            </div>
          </div>
        )}


        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg">Public price & availability</h2>
            <p className="text-xs text-muted-foreground">Only public-facing pricing. No supplier or margin data.</p>
            <Field label="Price mode">
              <select value={pa.price_mode} onChange={(e) => setPa({ ...pa, price_mode: e.target.value })} className={inp}>
                {PRICE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Public price (PKR)"><input type="number" value={pa.price} onChange={(e) => setPa({ ...pa, price: e.target.value })} className={inp} /></Field>
              <Field label="Previous price (optional)"><input type="number" value={pa.previous_price} onChange={(e) => setPa({ ...pa, previous_price: e.target.value })} className={inp} /></Field>
            </div>
            <Field label="Price note (optional)"><input value={pa.price_note} onChange={(e) => setPa({ ...pa, price_note: e.target.value })} className={inp} /></Field>
            <Field label="Availability">
              <select value={pa.availability} onChange={(e) => setPa({ ...pa, availability: e.target.value })} className={inp}>
                {AVAILABILITY_STATUSES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg">Specifications</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Load index"><input value={specs.load_index} onChange={(e) => setSpecs({ ...specs, load_index: e.target.value })} className={inp} /></Field>
              <Field label="Speed rating"><input value={specs.speed_rating} onChange={(e) => setSpecs({ ...specs, speed_rating: e.target.value })} className={inp} /></Field>
              <Field label="Ply rating"><input value={specs.ply_rating} onChange={(e) => setSpecs({ ...specs, ply_rating: e.target.value })} className={inp} /></Field>
              <Field label="Manufacturing country"><input value={specs.manufacturing_country} onChange={(e) => setSpecs({ ...specs, manufacturing_country: e.target.value })} className={inp} /></Field>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={specs.tubeless} onChange={(e) => setSpecs({ ...specs, tubeless: e.target.checked })} className="accent-primary" /> Tubeless</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={specs.run_flat} onChange={(e) => setSpecs({ ...specs, run_flat: e.target.checked })} className="accent-primary" /> Run-flat</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={specs.xl_reinforced} onChange={(e) => setSpecs({ ...specs, xl_reinforced: e.target.checked })} className="accent-primary" /> XL / Reinforced</label>
            </div>
            <Field label="Warranty (optional)"><input value={specs.warranty} onChange={(e) => setSpecs({ ...specs, warranty: e.target.value })} className={inp} /></Field>
            <Field label="Public notes"><textarea rows={2} value={specs.public_notes} onChange={(e) => setSpecs({ ...specs, public_notes: e.target.value })} className={inp} /></Field>
            <Field label="Private admin notes"><textarea rows={2} value={specs.private_notes} onChange={(e) => setSpecs({ ...specs, private_notes: e.target.value })} className={inp} /></Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg">Images (model-level)</h2>
            <p className="text-xs text-muted-foreground">These images are shared across all sizes of this model.</p>
            {(["main","tread","sidewall"] as const).map((k) => (
              <div key={k} className="flex items-center gap-4">
                {previews[k] ? <img src={previews[k]} className="h-20 w-20 rounded object-contain bg-muted" /> : <div className="grid h-20 w-20 place-items-center rounded bg-muted text-[10px] text-muted-foreground">{k}</div>}
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(k, f); }} />
              </div>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg">Preview</h2>
            <div className="rounded-lg border border-border p-4 text-sm">
              <div className="font-semibold">{brands.find((b: any) => b.id === brandId)?.name} {modelName}</div>
              <div className="text-muted-foreground">{normalized}</div>
              <div className="mt-2">Price mode: {pa.price_mode}, price: {pa.price || "—"}</div>
              <div>Availability: {pa.availability}</div>
              <div>Vehicles: {modelData.vehicle_categories.join(", ") || "—"}</div>
            </div>
          </div>
        )}
      </div>

      {msg.err && <div className="mt-3 rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
      {msg.ok && <div className="mt-3 rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}

      <div className="mt-4 flex items-center gap-2">
        <button disabled={step === 0} onClick={() => setStep(step - 1)} className="btn-outline text-sm"><ChevronLeft className="h-4 w-4" /> Previous</button>
        {step < STEPS.length - 1 ? (
          <button disabled={!canNext()} onClick={() => setStep(step + 1)} className="btn-primary text-sm">Save & Continue <ChevronRight className="h-4 w-4" /></button>
        ) : (
          <>
            <button disabled={saveVariant.isPending} onClick={() => saveVariant.mutate("draft")} className="btn-outline text-sm">{saveVariant.isPending ? "Saving…" : "Save Draft"}</button>
            <button disabled={saveVariant.isPending} onClick={() => saveVariant.mutate("published")} className="btn-primary text-sm">{saveVariant.isPending ? "Saving…" : "Publish"}</button>
          </>
        )}
      </div>
    </div>
  );
}

const inp = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>;
}
function MultiPick({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = values.includes(o);
        return (
          <button key={o} type="button" onClick={() => onChange(on ? values.filter((v) => v !== o) : [...values, o])}
            className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground/70"}`}>{o}</button>
        );
      })}
    </div>
  );
}
