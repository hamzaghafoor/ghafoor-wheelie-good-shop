import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { upsertTyreAdmin } from "@/lib/tyres.functions";
import { supabase } from "@/integrations/supabase/client";

type Initial = {
  id?: string;
  brand?: string; model?: string; size?: string; category?: string;
  price?: number | null; in_stock?: boolean; image_url?: string | null;
  image_signed_url?: string | null; description?: string | null;
  features?: string[]; vehicles?: string[];
  status?: "draft" | "published" | "archived";
};

const CATEGORIES = ["Passenger", "SUV", "Hatchback", "Commercial"];

export function TyreEditor({ initial }: { initial?: Initial }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const upsert = useServerFn(upsertTyreAdmin);

  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [size, setSize] = useState(initial?.size ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Passenger");
  const [price, setPrice] = useState<string>(initial?.price != null ? String(initial.price) : "");
  const [inStock, setInStock] = useState(initial?.in_stock ?? true);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [features, setFeatures] = useState((initial?.features ?? []).join("\n"));
  const [vehicles, setVehicles] = useState((initial?.vehicles ?? []).join(", "));
  const [imagePath, setImagePath] = useState<string | null>(initial?.image_url ?? null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_signed_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  async function onUpload(file: File) {
    setUploading(true); setMsg({});
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("tyre-images").upload(path, file, { upsert: false });
    if (error) { setUploading(false); return setMsg({ err: `Upload failed: ${error.message}` }); }
    const { data: signed } = await supabase.storage.from("tyre-images").createSignedUrl(path, 60 * 60);
    setImagePath(path);
    setImagePreview(signed?.signedUrl ?? null);
    setUploading(false);
  }

  const save = useMutation({
    mutationFn: async (status: "draft" | "published" | "archived") => {
      const payload = {
        id: initial?.id,
        brand: brand.trim(),
        model: model.trim(),
        size: size.trim(),
        category,
        price: price ? Number(price) : null,
        in_stock: inStock,
        image_url: imagePath,
        description: description || null,
        features: features.split("\n").map((s) => s.trim()).filter(Boolean),
        vehicles: vehicles.split(",").map((s) => s.trim()).filter(Boolean),
        status,
      };
      return upsert({ data: payload });
    },
    onSuccess: (res, status) => {
      qc.invalidateQueries({ queryKey: ["admin-tyres"] });
      qc.invalidateQueries({ queryKey: ["admin-tyres-summary"] });
      setMsg({ ok: `Saved as ${status}.` });
      setTimeout(() => navigate({ to: "/admin/tyres" }), 700);
    },
    onError: (e: any) => setMsg({ err: `Save failed: ${e.message}` }),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl">{initial?.id ? "Edit tyre" : "Add new tyre"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Save as Draft to keep private, or Publish to show on the website.</p>

      <div className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Brand *"><input required value={brand} onChange={(e) => setBrand(e.target.value)} className={inp} /></Field>
          <Field label="Model *"><input required value={model} onChange={(e) => setModel(e.target.value)} className={inp} /></Field>
          <Field label="Size *  (e.g. 195/65 R15)"><input required value={size} onChange={(e) => setSize(e.target.value)} className={inp} /></Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Price (PKR)"><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inp} /></Field>
          <Field label="Stock">
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="accent-primary" />
              In stock
            </label>
          </Field>
        </div>

        <Field label="Description">
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inp} />
        </Field>
        <Field label="Features (one per line)">
          <textarea rows={3} value={features} onChange={(e) => setFeatures(e.target.value)} className={inp} />
        </Field>
        <Field label="Suitable vehicles (comma-separated)">
          <input value={vehicles} onChange={(e) => setVehicles(e.target.value)} className={inp} />
        </Field>

        <Field label="Photo">
          <div className="flex items-start gap-4">
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className="h-24 w-24 rounded object-cover" />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded bg-muted text-xs text-muted-foreground">No image</div>
            )}
            <div>
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
              {uploading && <div className="mt-1 text-xs text-muted-foreground">Uploading…</div>}
            </div>
          </div>
        </Field>

        {msg.err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
        {msg.ok && <div className="rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}

        <div className="flex flex-wrap gap-2 pt-2">
          <button disabled={save.isPending} onClick={() => save.mutate("draft")} className="btn-outline text-sm">
            {save.isPending ? "Saving…" : "Save as Draft"}
          </button>
          <button disabled={save.isPending} onClick={() => save.mutate("published")} className="btn-primary text-sm">
            {save.isPending ? "Saving…" : (initial?.status === "published" ? "Save changes" : "Publish")}
          </button>
          <button type="button" onClick={() => navigate({ to: "/admin/tyres" })} className="ml-auto text-xs text-muted-foreground hover:text-ink">Cancel</button>
        </div>
      </div>
    </div>
  );
}

const inp = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}
