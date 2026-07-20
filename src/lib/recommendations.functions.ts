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

const REC_GROUPS = ["best_match", "premium", "value", "alternative"] as const;

/* -------------------- ADMIN -------------------- */

export const listRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { model_id: string; configuration_id?: string | null }) =>
    z.object({ model_id: z.string().uuid(), configuration_id: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q: any = (context.supabase as any).from("vehicle_recommendations")
      .select("*, brand:brands(id,name,logo_url), family:products!vehicle_recommendations_product_family_id_fkey(id,name,slug,category,status), type:product_types(id,name)")
      .eq("model_id", data.model_id)
      .order("category").order("display_order");
    if (data.configuration_id) q = q.eq("configuration_id", data.configuration_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const recSchema = z.object({
  id: z.string().uuid().optional(),
  make_id: z.string().uuid(),
  model_id: z.string().uuid(),
  configuration_id: z.string().uuid().nullable().optional(),
  category: z.enum(["tyres","lubricants","filters","maintenance_parts","car_care","additives","accessories","services"]),
  product_type_id: z.string().uuid().nullable().optional(),
  brand_id: z.string().uuid(),
  product_family_id: z.string().uuid(),
  rec_group: z.enum(REC_GROUPS),
  label: z.string().max(80).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  display_order: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
});

export const upsertRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { ...data, updated_by: context.userId };
    if (!patch.id) patch.created_by = context.userId;
    const { data: row, error } = await (context.supabase as any).from("vehicle_recommendations")
      .upsert(patch).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any)?.id };
  });

export const deleteRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("vehicle_recommendations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Admin helper: list published product families for pickers
export const listPublishedFamilies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { category?: string | null; brand_id?: string | null; product_type_id?: string | null; q?: string | null } = {}) =>
    z.object({
      category: z.string().nullable().optional(),
      brand_id: z.string().uuid().nullable().optional(),
      product_type_id: z.string().uuid().nullable().optional(),
      q: z.string().max(120).nullable().optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q: any = (context.supabase as any).from("products")
      .select("id,name,slug,category,brand_id,product_type_id,brand:brands(id,name)")
      .eq("archived", false).eq("status", "published").order("name").limit(200);
    if (data.category) q = q.eq("category", data.category);
    if (data.brand_id) q = q.eq("brand_id", data.brand_id);
    if (data.product_type_id) q = q.eq("product_type_id", data.product_type_id);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* -------------------- PUBLIC -------------------- */

export const getVehicleRecommendationsPublic = createServerFn({ method: "GET" })
  .inputValidator((d: { model_id: string; configuration_id?: string | null }) =>
    z.object({ model_id: z.string().uuid(), configuration_id: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient() as any;
    const { data: rows, error } = await sb.rpc("get_public_vehicle_recommendations", {
      _model_id: data.model_id,
      _configuration_id: data.configuration_id ?? null,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const searchPublicCatalogue = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string; category?: string | null; product_type_id?: string | null; brand_id?: string | null; limit?: number; offset?: number }) =>
    z.object({
      q: z.string().max(120).default(""),
      category: z.string().nullable().optional(),
      product_type_id: z.string().uuid().nullable().optional(),
      brand_id: z.string().uuid().nullable().optional(),
      limit: z.number().int().min(1).max(120).default(60),
      offset: z.number().int().min(0).default(0),
    }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient() as any;
    const { data: rows, error } = await sb.rpc("search_public_catalogue", {
      _q: data.q, _category: data.category ?? null, _product_type_id: data.product_type_id ?? null,
      _brand_id: data.brand_id ?? null, _limit: data.limit, _offset: data.offset,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPublicProductFamily = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient() as any;
    const { data: row, error } = await sb.rpc("get_public_product_family", { _slug: data.slug });
    if (error) throw new Error(error.message);
    return row;
  });

/* -------------------- ADMIN: COMPLETENESS -------------------- */

export const getFamilyCompleteness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { family_id: string }) => z.object({ family_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await (context.supabase as any).rpc("get_family_completeness", { _family_id: data.family_id });
    if (error) throw new Error(error.message);
    return row as { family_id: string; percent: number; passed: number; total: number; missing: string[] };
  });

export const listFamilyCompletenessFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any).rpc("list_family_completeness_flags");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      family_id: string; missing_image: boolean; missing_variant: boolean;
      missing_specs: boolean; missing_price: boolean; stale_availability: boolean;
    }>;
  });

/* -------------------- ADMIN: FRESHNESS -------------------- */

export const markAvailabilityChecked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { family_id: string; availability?: string | null }) =>
    z.object({ family_id: z.string().uuid(), availability: z.string().nullable().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { availability_verified_at: new Date().toISOString(), availability_verified_by: context.userId };
    if (data.availability) patch.availability = data.availability;
    const { error } = await (context.supabase as any).from("products").update(patch).eq("id", data.family_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
