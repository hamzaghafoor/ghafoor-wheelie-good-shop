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

async function signLogos(rows: any[]) {
  const sb = publicClient();
  const out: any[] = [];
  for (const r of rows) {
    let signed: string | null = null;
    if (r.logo_url) {
      const { data } = await sb.storage.from("tyre-images").createSignedUrl(r.logo_url, 60 * 60 * 24 * 7);
      signed = data?.signedUrl ?? null;
    }
    out.push({ ...r, logo_signed_url: signed });
  }
  return out;
}

export const listBrandsPublic = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb.from("brands")
    .select("id, name, slug, logo_url, country, description, is_featured, display_order")
    .eq("is_active", true).eq("archived", false).eq("status", "published")
    .order("display_order", { ascending: true }).order("name");
  if (error) throw new Error(error.message);
  return await signLogos(data ?? []);
});

export const listBrandsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("brands").select("*")
      .order("display_order").order("name");
    if (error) throw new Error(error.message);
    return await signLogos(data ?? []);
  });

export const getBrandAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from("brands").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Brand not found");
    const [signed] = await signLogos([row]);
    return signed;
  });

const brandSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  slug: z.string().max(80).optional().nullable(),
  logo_url: z.string().nullable().optional(),
  country: z.string().max(60).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  display_order: z.number().int().default(0),
});

export const upsertBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => brandSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, created_by: context.userId };
    if (data.id) {
      const { data: row, error } = await context.supabase.from("brands").update(payload).eq("id", data.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return { ok: true as const, id: row.id };
    }
    const { data: row, error } = await context.supabase.from("brands").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row.id };
  });

export const archiveBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; archived: boolean }) => z.object({ id: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("brands").update({ archived: data.archived }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const reorderBrands = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orders: { id: string; display_order: number }[] }) =>
    z.object({ orders: z.array(z.object({ id: z.string().uuid(), display_order: z.number().int() })) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    for (const o of data.orders) {
      await context.supabase.from("brands").update({ display_order: o.display_order }).eq("id", o.id);
    }
    return { ok: true as const };
  });
