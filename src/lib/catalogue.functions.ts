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

async function signImageDict(sb: ReturnType<typeof publicClient>, images: any): Promise<any> {
  if (!images || typeof images !== "object") return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(images)) {
    if (typeof v === "string" && v) {
      const { data } = await sb.storage.from("tyre-images").createSignedUrl(v, 60 * 60 * 24 * 7);
      out[k] = { path: v, url: data?.signedUrl ?? null };
    } else if (v && typeof v === "object" && (v as any).path) {
      const p = (v as any).path;
      const { data } = await sb.storage.from("tyre-images").createSignedUrl(p, 60 * 60 * 24 * 7);
      out[k] = { path: p, url: data?.signedUrl ?? null, alt: (v as any).alt };
    }
  }
  return out;
}

// ============ PUBLIC ============
export const listPublishedCatalogue = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data: brandsData } = await sb.from("brands")
    .select("id, name, logo_url").eq("is_active", true).eq("archived", false).eq("status", "published");
  const { data: models } = await sb.from("tyre_models")
    .select("id, brand_id, name, slug, code, short_desc, vehicle_categories, driving_characteristics, is_featured, tyre_type, images")
    .eq("status", "published").eq("archived", false);
  const { data: variants } = await sb.from("tyre_variants")
    .select("id, model_id, normalized_size, price_mode, price, previous_price, price_note, price_verified_at, availability, availability_verified_at, load_index, speed_rating, tubeless, run_flat, xl_reinforced, public_notes")
    .eq("status", "published").eq("archived", false);

  const brandMap = new Map((brandsData ?? []).map((b) => [b.id, b]));
  const modelMap = new Map<string, any>();

  for (const m of models ?? []) {
    const brand = brandMap.get(m.brand_id);
    if (!brand) continue;
    const signedImages = await signImageDict(sb, m.images);
    modelMap.set(m.id, { ...m, brand, images: signedImages, variants: [] });
  }
  const now = Date.now();
  for (const v of variants ?? []) {
    const model = modelMap.get(v.model_id);
    if (!model) continue;
    const priceAge = v.price_verified_at ? (now - new Date(v.price_verified_at).getTime()) / 86400000 : Infinity;
    const availAge = v.availability_verified_at ? (now - new Date(v.availability_verified_at).getTime()) / 86400000 : Infinity;
    model.variants.push({
      ...v,
      price_freshness: priceAge <= 7 ? "current" : priceAge <= 14 ? "review" : "outdated",
      availability_freshness: availAge <= 7 ? "current" : availAge <= 14 ? "review" : "outdated",
    });
  }
  return Array.from(modelMap.values()).filter((m) => m.variants.length > 0);
});

// ============ ADMIN: TYRE TREE ============
export const listCatalogueAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: brands } = await context.supabase.from("brands").select("id, name, logo_url, archived, is_active").order("name");
    const { data: models } = await context.supabase.from("tyre_models").select("*").order("updated_at", { ascending: false });
    const { data: variants } = await context.supabase.from("tyre_variants").select("*").order("normalized_size");
    return { brands: brands ?? [], models: models ?? [], variants: variants ?? [] };
  });

// ============ MODELS ============
const modelSchema = z.object({
  id: z.string().uuid().optional(),
  brand_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  code: z.string().max(60).nullable().optional(),
  short_desc: z.string().max(300).nullable().optional(),
  full_desc: z.string().max(2000).nullable().optional(),
  vehicle_categories: z.array(z.string()).default([]),
  driving_characteristics: z.array(z.string()).default([]),
  warranty: z.string().nullable().optional(),
  is_featured: z.boolean().default(false),
  internal_notes: z.string().nullable().optional(),
  images: z.record(z.any()).default({}),
  status: z.enum(["draft", "published", "archived", "scheduled"]).default("draft"),
});

export const getModelAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: model, error } = await context.supabase.from("tyre_models").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!model) throw new Error("Model not found");
    const { data: variants } = await context.supabase.from("tyre_variants").select("*").eq("model_id", data.id).order("normalized_size");
    return { model, variants: variants ?? [] };
  });

export const upsertModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => modelSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, created_by: context.userId };
    if (data.id) {
      const { data: row, error } = await context.supabase.from("tyre_models").update(payload).eq("id", data.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) throw new Error("No row returned"); return { ok: true as const, id: (row as any).id };
    }
    const { data: row, error } = await context.supabase.from("tyre_models").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("No row returned"); return { ok: true as const, id: (row as any).id };
  });

export const setModelStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "draft" | "published" | "archived" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "published", "archived"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { status: data.status };
    if (data.status === "archived") patch.archived = true;
    if (data.status === "published") patch.archived = false;
    const { error } = await context.supabase.from("tyre_models").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    // Also cascade to variants if publishing/archiving? Keep independent.
    return { ok: true as const };
  });

// ============ VARIANTS ============
const variantSchema = z.object({
  id: z.string().uuid().optional(),
  model_id: z.string().uuid(),
  width: z.number().int().nullable().optional(),
  profile: z.number().int().nullable().optional(),
  rim: z.number().nullable().optional(),
  size_format: z.string().default("metric"),
  normalized_size: z.string().min(1),
  price_mode: z.enum(["fixed","confirm_today","on_request","starting_from","hidden"]).default("confirm_today"),
  price: z.number().nullable().optional(),
  previous_price: z.number().nullable().optional(),
  price_note: z.string().nullable().optional(),
  availability: z.enum(["in_stock","limited","check","out_of_stock","on_order","discontinued"]).default("check"),
  load_index: z.string().nullable().optional(),
  speed_rating: z.string().nullable().optional(),
  tubeless: z.boolean().default(true),
  run_flat: z.boolean().default(false),
  xl_reinforced: z.boolean().default(false),
  ply_rating: z.string().nullable().optional(),
  manufacturing_country: z.string().nullable().optional(),
  warranty: z.string().nullable().optional(),
  public_notes: z.string().nullable().optional(),
  private_notes: z.string().nullable().optional(),
  status: z.enum(["draft","published","archived","scheduled"]).default("draft"),
});

export const checkDuplicateVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { model_id: string; normalized_size: string; exclude_id?: string }) =>
    z.object({ model_id: z.string().uuid(), normalized_size: z.string().min(1), exclude_id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase.from("tyre_variants").select("id, status").eq("model_id", data.model_id).eq("normalized_size", data.normalized_size);
    if (data.exclude_id) q = q.neq("id", data.exclude_id);
    const { data: rows } = await q;
    return { exists: (rows?.length ?? 0) > 0, id: rows?.[0]?.id ?? null };
  });

export const upsertVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => variantSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, created_by: context.userId };
    if (data.id) {
      const { data: row, error } = await context.supabase.from("tyre_variants").update(payload).eq("id", data.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) throw new Error("No row returned"); return { ok: true as const, id: (row as any).id };
    }
    const { data: row, error } = await context.supabase.from("tyre_variants").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("No row returned"); return { ok: true as const, id: (row as any).id };
  });

export const setVariantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "draft" | "published" | "archived" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "published", "archived"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { status: data.status };
    if (data.status === "archived") patch.archived = true;
    if (data.status === "published") patch.archived = false;
    const { error } = await context.supabase.from("tyre_variants").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const quickUpdatePrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    price_mode: z.enum(["fixed","confirm_today","on_request","starting_from","hidden"]).optional(),
    price: z.number().nullable().optional(),
    previous_price: z.number().nullable().optional(),
    price_note: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { ...data, price_verified_at: new Date().toISOString(), price_verified_by: context.userId };
    delete patch.id;
    const { error } = await context.supabase.from("tyre_variants").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const priceStillCorrect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("tyre_variants")
      .update({ price_verified_at: new Date().toISOString(), price_verified_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const quickUpdateAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; availability: string }) => z.object({
    id: z.string().uuid(),
    availability: z.enum(["in_stock","limited","check","out_of_stock","on_order","discontinued"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("tyre_variants")
      .update({ availability: data.availability, availability_verified_at: new Date().toISOString(), availability_verified_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const duplicateVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; new_size: string }) => z.object({ id: z.string().uuid(), new_size: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: src, error } = await context.supabase.from("tyre_variants").select("*").eq("id", data.id).maybeSingle();
    if (error || !src) throw new Error("Source variant not found");
    const { id, created_at, updated_at, ...rest } = src as any;
    const { data: row, error: e2 } = await context.supabase.from("tyre_variants")
      .insert({ ...rest, normalized_size: data.new_size, status: "draft", created_by: context.userId }).select().maybeSingle();
    if (e2) throw new Error(e2.message);
    if (!row) throw new Error("No row returned"); return { ok: true as const, id: (row as any).id };
  });
