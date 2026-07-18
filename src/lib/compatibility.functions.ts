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

// Model-level compat uses existing table: tyre_model_id + vehicle_model_id + optional year_from/year_to
export const listModelCompat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { model_id: string }) => z.object({ model_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows } = await (context.supabase as any)
      .from("tyre_model_vehicle_compat")
      .select("id, vehicle_model_id, year_from, year_to, notes")
      .eq("tyre_model_id", data.model_id);
    return rows ?? [];
  });

export const addModelCompat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    tyre_model_id: z.string().uuid(),
    entries: z.array(z.object({
      vehicle_model_id: z.string().uuid(),
      year_from: z.number().int().nullable().optional(),
      year_to: z.number().int().nullable().optional(),
      notes: z.string().max(200).nullable().optional(),
    })).min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const rows = data.entries.map(e => ({ tyre_model_id: data.tyre_model_id, ...e }));
    const { error } = await (context.supabase as any).from("tyre_model_vehicle_compat").insert(rows);
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
    const { error } = await (context.supabase as any).from(table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ============= VARIANT-LEVEL COMPAT =============
export const listVariantCompat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { variant_id: string }) => z.object({ variant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await (context.supabase as any)
      .from("tyre_variant_vehicle_compat")
      .select("id, make_id, model_id, year_id, note")
      .eq("variant_id", data.variant_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addVariantCompat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    variant_id: z.string().uuid(),
    make_id: z.string().uuid(),
    vehicle_model_ids: z.array(z.string().uuid()).min(1),
    year_id: z.string().uuid().nullable().optional(),
    note: z.string().max(200).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const rows = data.vehicle_model_ids.map((mid) => ({
      variant_id: data.variant_id,
      make_id: data.make_id,
      model_id: mid,
      year_id: data.year_id ?? null,
      note: data.note ?? null,
    }));
    const { error } = await (context.supabase as any).from("tyre_variant_vehicle_compat").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true as const, added: rows.length };
  });

// Public: find matching VARIANT ids for a vehicle (variant-level compat only).
export const findVariantsByVehicle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    vehicle_model_id: z.string().uuid().optional(),
    make_id: z.string().uuid().optional(),
    year: z.number().int().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q: any = (sb as any).from("tyre_variant_vehicle_compat").select("variant_id, model_id, make_id, year_id");
    if (data.vehicle_model_id) q = q.eq("model_id", data.vehicle_model_id);
    else if (data.make_id) q = q.eq("make_id", data.make_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let matched = rows ?? [];
    if (data.year != null && matched.length) {
      const yearIds = Array.from(new Set(matched.map((r: any) => r.year_id).filter(Boolean)));
      let yearsMap = new Map<string, { year_from: number; year_to: number | null }>();
      if (yearIds.length) {
        const { data: yrows } = await (sb as any).from("vehicle_years").select("id, year_from, year_to").in("id", yearIds);
        yearsMap = new Map((yrows ?? []).map((y: any) => [y.id, y]));
      }
      matched = matched.filter((r: any) => {
        if (!r.year_id) return true;
        const y = yearsMap.get(r.year_id);
        if (!y) return false;
        return data.year! >= y.year_from && (y.year_to == null || data.year! <= y.year_to);
      });
    }
    return Array.from(new Set(matched.map((r: any) => r.variant_id))) as string[];
  });

export const getTyreModelBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: model, error } = await sb.from("tyre_models")
      .select("id, brand_id, name, slug, short_desc, full_desc, warranty, warranty_text, pattern_name, tyre_type, origin_country, vehicle_categories, driving_characteristics, recommended_use, images")
      .eq("slug", data.slug).eq("status", "published").eq("archived", false).maybeSingle();
    if (error) throw new Error(error.message);
    if (!model) throw new Error("Not found");
    const [{ data: brand }, { data: variants }, { data: modelCompat }] = await Promise.all([
      sb.from("brands").select("id, name, logo_url, country").eq("id", (model as any).brand_id).maybeSingle(),
      sb.from("tyre_variants").select("*").eq("model_id", (model as any).id).eq("status","published").eq("archived", false),
      (sb as any).from("tyre_model_vehicle_compat").select("vehicle_model_id, year_from, year_to").eq("tyre_model_id", (model as any).id),
    ]);
    const variantIds = (variants ?? []).map((v: any) => v.id);
    let variantCompat: any[] = [];
    if (variantIds.length) {
      const { data: vc } = await (sb as any).from("tyre_variant_vehicle_compat")
        .select("variant_id, make_id, model_id, year_id").in("variant_id", variantIds);
      variantCompat = vc ?? [];
    }
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
      compat: modelCompat ?? [],
      variantCompat,
    };
  });

