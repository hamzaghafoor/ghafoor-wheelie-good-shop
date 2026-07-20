import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// -------------------- helpers --------------------
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

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function signImagePath(sb: ReturnType<typeof publicClient>, path?: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await sb.storage.from("tyre-images").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

// Public-safe product columns (never exposes internal_notes, erp_description, private_notes)
const PUBLIC_PRODUCT_COLS =
  "id, name, slug, category, brand_id, product_type_id, purpose_label_ids, sku, part_number, images, specs, short_desc, full_desc, is_featured, price, previous_price, price_mode, price_note, availability, status, archived, updated_at";

const PUBLIC_VARIANT_COLS =
  "id, product_id, pack_value, pack_unit_code, pack_label, normalized_base_qty, normalized_kind, price, compare_at_price, availability, image_path, is_default, display_order";

const CATEGORY_ENUM = ["tyres","lubricants","filters","maintenance_parts","car_care","additives","accessories","services"] as const;
const CONTENT_STATUS = ["draft","published","archived","scheduled"] as const;
const AVAILABILITY = ["in_stock","limited","check","out_of_stock","on_order","discontinued"] as const;
const VARIANT_STATUS = ["draft","published","archived"] as const;

// ============================================================================
// PUBLIC READS (minimum safe foundation, no redesign)
// ============================================================================
export const listCatalogueSettingsPublic = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("catalogue_settings").select("*").eq("id", 1).maybeSingle();
  return data ?? null;
});

export const listPublishedProducts = createServerFn({ method: "GET" })
  .inputValidator((d: { category?: string; type_id?: string; brand_id?: string; limit?: number } | undefined) =>
    z.object({ category: z.string().optional(), type_id: z.string().uuid().optional(), brand_id: z.string().uuid().optional(), limit: z.number().int().min(1).max(200).optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("products").select(PUBLIC_PRODUCT_COLS).eq("status", "published").eq("archived", false);
    if (data.category) q = q.eq("category", data.category as any);
    if (data.type_id) q = q.eq("product_type_id", data.type_id);
    if (data.brand_id) q = q.eq("brand_id", data.brand_id);
    q = q.order("is_featured", { ascending: false }).order("name").limit(data.limit ?? 60);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPublishedProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: p } = await sb.from("products").select(PUBLIC_PRODUCT_COLS).eq("slug", data.slug).eq("status","published").eq("archived", false).maybeSingle();
    if (!p) return null;
    const { data: variants } = await sb.from("product_variants").select(PUBLIC_VARIANT_COLS).eq("product_id", p.id).eq("status","published").eq("archived", false).order("display_order");
    return { product: p, variants: variants ?? [] };
  });

export const listPublicHomepageSections = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("homepage_catalogue_sections").select("*").eq("is_visible", true).order("display_order");
  return data ?? [];
});

// ============================================================================
// LOOKUPS (auth) — used by admin forms
// ============================================================================
export const listLookups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [brands, types, labels, units, presets] = await Promise.all([
      context.supabase.from("brands").select("id, name, slug, categories, archived").order("name"),
      context.supabase.from("product_types").select("*").order("parent_category").order("display_order"),
      context.supabase.from("product_type_labels").select("*").order("display_order"),
      context.supabase.from("packaging_units").select("*").order("display_order"),
      context.supabase.from("packaging_presets").select("*").order("display_order"),
    ]);
    return {
      brands: brands.data ?? [],
      types: types.data ?? [],
      labels: labels.data ?? [],
      units: units.data ?? [],
      presets: presets.data ?? [],
    };
  });

// ============================================================================
// PRODUCTS (admin)
// ============================================================================
export const listProductsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q?: string; category?: string; brand_id?: string; type_id?: string; status?: string; show_archived?: boolean } | undefined) =>
    z.object({
      q: z.string().optional(),
      category: z.string().optional(),
      brand_id: z.string().uuid().optional(),
      type_id: z.string().uuid().optional(),
      status: z.string().optional(),
      show_archived: z.boolean().optional(),
    }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase.from("products").select("id, name, slug, category, brand_id, product_type_id, status, archived, is_featured, updated_at").order("updated_at", { ascending: false }).limit(500);
    if (!data.show_archived) q = q.eq("archived", false);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    if (data.category) q = q.eq("category", data.category as any);
    if (data.brand_id) q = q.eq("brand_id", data.brand_id);
    if (data.type_id) q = q.eq("product_type_id", data.type_id);
    if (data.status) q = q.eq("status", data.status as any);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProductAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: product, error } = await context.supabase.from("products").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!product) throw new Error("Product not found");
    const { data: variants } = await context.supabase.from("product_variants").select("*").eq("product_id", data.id).order("display_order");
    // Sign variant images
    const sb = publicClient();
    const enriched = await Promise.all((variants ?? []).map(async (v: any) => ({ ...v, image_signed_url: await signImagePath(sb, v.image_path) })));
    return { product, variants: enriched };
  });

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  slug: z.string().max(200).optional(),
  category: z.enum(CATEGORY_ENUM),
  brand_id: z.string().uuid().nullable().optional(),
  product_type_id: z.string().uuid().nullable().optional(),
  purpose_label_ids: z.array(z.string().uuid()).default([]),
  sku: z.string().max(80).nullable().optional(),
  part_number: z.string().max(80).nullable().optional(),
  short_desc: z.string().max(500).nullable().optional(),
  full_desc: z.string().max(4000).nullable().optional(),
  images: z.array(z.object({ path: z.string(), alt: z.string().optional() })).default([]),
  specs: z.record(z.any()).default({}),
  is_featured: z.boolean().default(false),
  status: z.enum(CONTENT_STATUS).default("draft"),
  availability: z.enum(AVAILABILITY).default("check"),
  internal_notes: z.string().max(2000).nullable().optional(),
  erp_description: z.string().max(2000).nullable().optional(),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data };
    if (!payload.slug) payload.slug = slugify(payload.name);
    payload.images = data.images as any;
    if (data.id) {
      const { error } = await context.supabase.from("products").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    payload.created_by = context.userId;
    const { data: row, error } = await context.supabase.from("products").insert(payload).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

export const setProductStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => z.object({ id: z.string().uuid(), status: z.enum(CONTENT_STATUS) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { status: data.status };
    if (data.status === "archived") patch.archived = true;
    if (data.status === "published") patch.archived = false;
    const { error } = await context.supabase.from("products").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const archiveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; archived: boolean }) => z.object({ id: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { archived: data.archived };
    if (data.archived) patch.status = "archived";
    const { error } = await context.supabase.from("products").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const duplicateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: src } = await context.supabase.from("products").select("*").eq("id", data.id).maybeSingle();
    if (!src) throw new Error("Product not found");
    const { id, created_at, updated_at, slug, ...rest } = src as any;
    const newName = `${(rest as any).name} (copy)`;
    const newSlug = `${slug}-copy-${Date.now().toString(36).slice(-4)}`;
    const { data: row, error } = await context.supabase.from("products").insert({ ...rest, name: newName, slug: newSlug, status: "draft", is_featured: false, created_by: context.userId }).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

// ============================================================================
// VARIANTS (admin)
// ============================================================================
const variantSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  pack_value: z.number().positive(),
  pack_unit_code: z.string().min(1),
  pack_label: z.string().max(80).nullable().optional(),
  erp_stock_id: z.string().max(80).nullable().optional(),
  price: z.number().nullable().optional(),
  compare_at_price: z.number().nullable().optional(),
  availability: z.enum(AVAILABILITY).default("check"),
  image_path: z.string().nullable().optional(),
  is_default: z.boolean().default(false),
  display_order: z.number().int().default(0),
  status: z.enum(VARIANT_STATUS).default("draft"),
  private_notes: z.string().max(1000).nullable().optional(),
});

export const upsertVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => variantSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data };
    // If setting this variant as default, unset siblings first
    if (payload.is_default && data.id) {
      await context.supabase.from("product_variants").update({ is_default: false }).eq("product_id", data.product_id).neq("id", data.id);
    } else if (payload.is_default && !data.id) {
      await context.supabase.from("product_variants").update({ is_default: false }).eq("product_id", data.product_id);
    }
    if (data.id) {
      const { error } = await context.supabase.from("product_variants").update(payload).eq("id", data.id);
      if (error) throw new Error(mapVariantErr(error.message));
      return { ok: true as const, id: data.id };
    }
    payload.created_by = context.userId;
    const { data: row, error } = await context.supabase.from("product_variants").insert(payload).select("id").maybeSingle();
    if (error) throw new Error(mapVariantErr(error.message));
    return { ok: true as const, id: (row as any).id };
  });

function mapVariantErr(msg: string) {
  if (msg.includes("pv_dedupe_uidx")) return "A variant with this pack size already exists on this product (1 L and 1000 ml count as the same size).";
  if (msg.includes("pv_stock_id_uidx")) return "This ERP Stock ID is already used by another variant.";
  if (msg.includes("pv_default_uidx")) return "Only one default variant is allowed per product.";
  return msg;
}

export const deleteVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("product_variants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setVariantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => z.object({ id: z.string().uuid(), status: z.enum(VARIANT_STATUS) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { status: data.status };
    if (data.status === "archived") patch.archived = true;
    else patch.archived = false;
    const { error } = await context.supabase.from("product_variants").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const reorderVariants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orders: { id: string; display_order: number }[] }) =>
    z.object({ orders: z.array(z.object({ id: z.string().uuid(), display_order: z.number().int() })) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    for (const o of data.orders) {
      await context.supabase.from("product_variants").update({ display_order: o.display_order }).eq("id", o.id);
    }
    return { ok: true as const };
  });

// ============================================================================
// PRODUCT TYPES + LABELS (admin)
// ============================================================================
export const upsertProductType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(80),
    slug: z.string().max(80).optional(),
    parent_category: z.enum(CATEGORY_ENUM),
    display_order: z.number().int().default(0),
    is_active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, slug: data.slug || slugify(data.name) };
    if (data.id) {
      const { error } = await context.supabase.from("product_types").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    payload.created_by = context.userId;
    const { data: row, error } = await context.supabase.from("product_types").insert(payload).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

export const archiveProductType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; archived: boolean }) => z.object({ id: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.archived) {
      const { count } = await context.supabase.from("products").select("id", { count: "exact", head: true }).eq("product_type_id", data.id).eq("archived", false);
      if ((count ?? 0) > 0) throw new Error(`Cannot archive: ${count} active products still use this type. Reassign them first.`);
    }
    const { error } = await context.supabase.from("product_types").update({ archived: data.archived, is_active: !data.archived }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const upsertPurposeLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    type_id: z.string().uuid().nullable().optional(),
    label: z.string().min(1).max(80),
    slug: z.string().max(80).optional(),
    display_order: z.number().int().default(0),
    is_active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, slug: data.slug || slugify(data.label) };
    if (data.id) {
      const { error } = await context.supabase.from("product_type_labels").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    payload.created_by = context.userId;
    const { data: row, error } = await context.supabase.from("product_type_labels").insert(payload).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

export const archivePurposeLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; archived: boolean }) => z.object({ id: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("product_type_labels").update({ archived: data.archived, is_active: !data.archived }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ============================================================================
// PACKAGING (presets + unit visibility)
// ============================================================================
export const upsertPackagingPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    value_numeric: z.number().positive(),
    unit_code: z.string().min(1),
    display_label: z.string().max(40).nullable().optional(),
    display_order: z.number().int().default(0),
    is_active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { error } = await context.supabase.from("packaging_presets").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: row, error } = await context.supabase.from("packaging_presets").insert(data).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

export const deletePackagingPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("packaging_presets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateUnitVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; is_visible?: boolean; display_label?: string }) =>
    z.object({ code: z.string(), is_visible: z.boolean().optional(), display_label: z.string().max(40).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = {};
    if (typeof data.is_visible === "boolean") patch.is_visible = data.is_visible;
    if (typeof data.display_label === "string") patch.display_label = data.display_label;
    const { error } = await context.supabase.from("packaging_units").update(patch).eq("code", data.code);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ============================================================================
// CATALOGUE SETTINGS
// ============================================================================
export const getCatalogueSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("catalogue_settings").select("*").eq("id", 1).maybeSingle();
    return data;
  });

export const updateCatalogueSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    default_availability: z.enum(AVAILABILITY).optional(),
    default_import_status: z.enum(["draft","published","archived"]).optional(),
    products_per_page: z.number().int().min(6).max(96).optional(),
    whatsapp_cta_text: z.string().min(1).max(80).optional(),
    empty_catalogue_message: z.string().max(300).optional(),
    price_confirm_text: z.string().max(120).optional(),
    catalogue_phone: z.string().max(40).nullable().optional(),
    nav_categories: z.array(z.enum(CATEGORY_ENUM)).optional(),
    category_order: z.array(z.enum(CATEGORY_ENUM)).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("catalogue_settings").update({ ...data, updated_by: context.userId }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ============================================================================
// HOMEPAGE CATALOGUE SECTIONS
// ============================================================================
export const listHomepageCatalogueSectionsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("homepage_catalogue_sections").select("*").order("display_order");
    return data ?? [];
  });

export const upsertHomepageCatalogueSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    kind: z.enum(["heading","product_grid","brand_grid","category_cards","cta"]),
    heading: z.string().max(200).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    cta_label: z.string().max(80).nullable().optional(),
    cta_link: z.string().max(400).nullable().optional(),
    product_ids: z.array(z.string().uuid()).default([]),
    brand_ids: z.array(z.string().uuid()).default([]),
    category_slugs: z.array(z.string()).default([]),
    is_visible: z.boolean().default(true),
    display_order: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { error } = await context.supabase.from("homepage_catalogue_sections").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const payload: any = { ...data, created_by: context.userId };
    const { data: row, error } = await context.supabase.from("homepage_catalogue_sections").insert(payload).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

export const deleteHomepageCatalogueSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("homepage_catalogue_sections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ============================================================================
// BRAND MERGE
// ============================================================================
export const mergeBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string; notes?: string }) =>
    z.object({ from: z.string().uuid(), to: z.string().uuid(), notes: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: res, error } = await context.supabase.rpc("merge_brand", { _from: data.from, _to: data.to, _notes: data.notes ?? undefined });
    if (error) throw new Error(error.message);
    return res as any;
  });

// ============================================================================
// IMAGE UPLOAD (signed URL for reuse of tyre-images bucket)
// ============================================================================
export const uploadCatalogueImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { filename: string; contentBase64: string; contentType?: string }) =>
    z.object({ filename: z.string().min(1).max(200), contentBase64: z.string().min(4), contentType: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const bytes = Uint8Array.from(atob(data.contentBase64), (c) => c.charCodeAt(0));
    const safe = data.filename.toLowerCase().replace(/[^a-z0-9.\-]+/g, "-");
    const path = `catalogue/${Date.now()}-${safe}`;
    const { error } = await context.supabase.storage.from("tyre-images").upload(path, bytes, { contentType: data.contentType ?? "application/octet-stream", upsert: false });
    if (error) throw new Error(error.message);
    const sb = publicClient();
    const { data: s } = await sb.storage.from("tyre-images").createSignedUrl(path, 60 * 60 * 24 * 7);
    return { ok: true as const, path, signed_url: s?.signedUrl ?? null };
  });

export const signPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = publicClient();
    const { data: s } = await sb.storage.from("tyre-images").createSignedUrl(data.path, 60 * 60 * 24 * 7);
    return { signed_url: s?.signedUrl ?? null };
  });
