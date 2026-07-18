import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { upsertBrand } from "@/lib/brands.functions";
import { supabase } from "@/integrations/supabase/client";

type Initial = {
  id?: string; name?: string; logo_url?: string | null; logo_signed_url?: string | null;
  country?: string | null; description?: string | null;
  is_featured?: boolean; is_active?: boolean; display_order?: number;
};

export function BrandEditor({ initial }: { initial?: Initial }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const upsert = useServerFn(upsertBrand);

  const [name, setName] = useState(initial?.name ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [order, setOrder] = useState(initial?.display_order ?? 0);
  const [logoPath, setLogoPath] = useState<string | null>(initial?.logo_url ?? null);
  const [preview, setPreview] = useState<string | null>(initial?.logo_signed_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  async function onUpload(file: File) {
    setUploading(true); setMsg({});
    const ext = file.name.split(".").pop() || "png";
    const path = `brands/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error } = await supabase.storage.from("tyre-images").upload(path, file);
    if (error) { setUploading(false); return setMsg({ err: error.message }); }
    const { data } = await supabase.storage.from("tyre-images").createSignedUrl(path, 3600);
    setLogoPath(path); setPreview(data?.signedUrl ?? null); setUploading(false);
  }

  const save = useMutation({
    mutationFn: () => upsert({ data: { id: initial?.id, name: name.trim(), country: country || null, description: description || null, is_featured: isFeatured, is_active: isActive, display_order: Number(order) || 0, logo_url: logoPath } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adm-brands"] }); setMsg({ ok: "Saved." }); setTimeout(() => navigate({ to: "/admin/brands" }), 500); },
    onError: (e: any) => setMsg({ err: e.message }),
  });

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl">{initial?.id ? "Edit brand" : "Add new brand"}</h1>
      <div className="mt-6 space-y-4">
        <Field label="Brand name *"><input required value={name} onChange={(e) => setName(e.target.value)} className={inp} /></Field>
        <Field label="Country (optional)"><input value={country ?? ""} onChange={(e) => setCountry(e.target.value)} className={inp} /></Field>
        <Field label="Short description (optional)">
          <textarea rows={3} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} className={inp} />
        </Field>
        <Field label="Logo">
          <div className="flex items-center gap-4">
            {preview ? <img src={preview} className="h-16 w-16 rounded object-contain bg-muted" /> : <div className="grid h-16 w-16 place-items-center rounded bg-muted text-[10px] text-muted-foreground">No logo</div>}
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-primary" /> Featured</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-primary" /> Active</label>
        </div>
        <Field label="Display order"><input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className={inp} /></Field>

        {msg.err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
        {msg.ok && <div className="rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}

        <div className="flex gap-2 pt-2">
          <button disabled={save.isPending || !name} onClick={() => save.mutate()} className="btn-primary text-sm">{save.isPending ? "Saving…" : "Save"}</button>
          <button onClick={() => navigate({ to: "/admin/brands" })} className="text-xs text-muted-foreground hover:text-ink">Cancel</button>
        </div>
      </div>
    </div>
  );
}

const inp = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>;
}
