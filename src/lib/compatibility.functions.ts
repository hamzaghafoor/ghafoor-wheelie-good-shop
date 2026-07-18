import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if ((key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listModelCompat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { model_id: string }) => z.object({ model_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows } = await context.supabase
      .from("tyre_model_vehicle_compat")
      .select("id, make_id, model_id, year_id")
      .eq("tyre_model_id", data.model_id);
    return rows ?? [];
  });

export const addModelCompat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    tyre_model_id: z.string().uuid(),
    entries: z.array(z.object({
      make_id: z.string().uuid().nullable().optional(),
      model_id: z.string().uuid().nullable().optional(),
      year_id: z.string().uuid().nullable().optional(),
    })).min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const rows = data.entries.map(e => ({ tyre_model_id: data.tyre_model_id, ...e }));
    const { error } = await context.supabase.from("tyre_model_vehicle_compat").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true as const, added: rows.length };
  });

export const removeCompat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; kind: "model" | "variant" }) =>
    z.object({ id: z.string().uuid(), kind: z.enum(["model","variant"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const table = data.kind === "model" ? "tyre_model_vehicle_compat" : "tyre_variant_vehicle_compat";
    const { error } = await context.supabase.from(table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Public: fetch tyre models compatible with a given vehicle (any level)
export const findModelsByVehicle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    make_id: z.string().uuid().optional(),
    model_id: z.string().uuid().optional(),
    year_id: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("tyre_model_vehicle_compat").select("tyre_model_id");
    if (data.year_id) q = q.eq("year_id", data.year_id);
    else if (data.model_id) q = q.eq("model_id", data.model_id);
    else if (data.make_id) q = q.eq("make_id", data.make_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.tyre_model_id).filter(Boolean)));
    return ids;
  });

// Public: fetch tyre model by slug for detail page (with all variants + brand + compat)
export const getTyreModelBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: model, error } = await sb.from("tyre_models")
      .select("id, brand_id, name, slug, short_desc, full_desc, warranty, warranty_text, pattern_name, tyre_type, origin_country, vehicle_categories, driving_characteristics, recommended_use, images")
      .eq("slug", data.slug).eq("status", "published").eq("archived", false).maybeSingle();
    if (error) throw new Error(error.message);
    if (!model) throw new Error("Not found");
    const [{ data: brand }, { data: variants }, { data: compat }] = await Promise.all([
      sb.from("brands").select("id, name, logo_url, country").eq("id", (model as any).brand_id).maybeSingle(),
      sb.from("tyre_variants").select("*").eq("model_id", (model as any).id).eq("status","published").eq("archived", false),
      sb.from("tyre_model_vehicle_compat").select("make_id, model_id, year_id").eq("tyre_model_id", (model as any).id),
    ]);
    // Sign images
    const signedImages: any = {};
    for (const [k, v] of Object.entries(((model as any).images ?? {}) as Record<string, any>)) {
      const path = typeof v === "string" ? v : v?.path;
      if (!path) continue;
      const { data: s } = await sb.storage.from("tyre-images").createSignedUrl(path, 60 * 60 * 24 * 7);
      signedImages[k] = { path, url: s?.signedUrl ?? null, alt: (v as any)?.alt };
    }
    let brandLogo: string | null = null;
    if ((brand as any)?.logo_url) {
      const { data: s } = await sb.storage.from("tyre-images").createSignedUrl((brand as any).logo_url, 60 * 60 * 24 * 7);
      brandLogo = s?.signedUrl ?? null;
    }
    return {
      model: { ...(model as any), images: signedImages },
      brand: brand ? { ...(brand as any), logo_signed_url: brandLogo } : null,
      variants: variants ?? [],
      compat: compat ?? [],
    };
  });
