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

const STATUSES = ["verified", "commonly_used", "needs_confirmation"] as const;

const fitmentSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid().nullable().optional(),
  variant_id: z.string().uuid().nullable().optional(),
  make_id: z.string().uuid(),
  model_id: z.string().uuid(),
  year_from: z.number().int().min(1950).max(2100).nullable().optional(),
  year_to: z.number().int().min(1950).max(2100).nullable().optional(),
  trim: z.string().max(80).nullable().optional(),
  engine: z.string().max(80).nullable().optional(),
  market: z.string().max(6).default("PK"),
  status: z.enum(STATUSES).default("needs_confirmation"),
  notes: z.string().max(300).nullable().optional(),
}).refine((d) => !!d.product_id !== !!d.variant_id, { message: "Provide exactly one of product_id or variant_id" });

/* ------------ ADMIN ------------ */

export const listFitmentsForTarget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { product_id?: string; variant_id?: string }) =>
    z.object({ product_id: z.string().uuid().optional(), variant_id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q: any = (context.supabase as any).from("vehicle_fitments")
      .select("*, make:vehicle_makes(id,name), model:vehicle_models(id,name)")
      .order("created_at", { ascending: false });
    if (data.product_id) q = q.eq("product_id", data.product_id);
    else if (data.variant_id) q = q.eq("variant_id", data.variant_id);
    else return [];
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertFitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => fitmentSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, updated_by: context.userId, source: "admin", approved: true };
    if (!payload.id) payload.created_by = context.userId;
    const { data: row, error } = await (context.supabase as any).from("vehicle_fitments")
      .upsert(payload).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any)?.id };
  });

export const deleteFitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("vehicle_fitments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const bulkApplyFitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    product_ids: z.array(z.string().uuid()).min(1).max(500),
    make_id: z.string().uuid(),
    model_id: z.string().uuid(),
    year_from: z.number().int().nullable().optional(),
    year_to: z.number().int().nullable().optional(),
    trim: z.string().max(80).nullable().optional(),
    engine: z.string().max(80).nullable().optional(),
    market: z.string().max(6).default("PK"),
    status: z.enum(STATUSES).default("commonly_used"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const rows = data.product_ids.map((pid) => ({
      product_id: pid, variant_id: null,
      make_id: data.make_id, model_id: data.model_id,
      year_from: data.year_from ?? null, year_to: data.year_to ?? null,
      trim: data.trim ?? null, engine: data.engine ?? null,
      market: data.market ?? "PK", status: data.status,
      source: "admin", approved: true,
      created_by: context.userId, updated_by: context.userId,
    }));
    // Upsert onto unique index — preserves any manually approved conflicting row (idempotent).
    const { error } = await (context.supabase as any).from("vehicle_fitments")
      .upsert(rows, { onConflict: "product_id,variant_id,model_id,year_from,year_to,trim,engine,market", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { ok: true as const, applied: rows.length };
  });

/* ------------ PUBLIC ------------ */

// Given a vehicle, return product ranking metadata (used by search).
export const rankProductsForVehiclePublic = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ model_id: z.string().uuid(), year: z.number().int().nullable().optional(), engine: z.string().max(80).nullable().optional() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb.rpc("rank_products_for_vehicle", {
      _model_id: data.model_id, _year: data.year ?? null, _engine: data.engine ?? null,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
