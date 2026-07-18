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

// ============ PUBLIC ============
export const listVehiclesPublic = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [{ data: makes }, { data: models }] = await Promise.all([
    sb.from("vehicle_makes").select("id, name, slug, logo_url, display_order").eq("is_active", true).eq("archived", false).order("display_order").order("name"),
    sb.from("vehicle_models").select("id, make_id, name, slug, body_type, is_popular").eq("is_active", true).eq("archived", false).order("name"),
  ]);
  return { makes: makes ?? [], models: models ?? [] };
});

// ============ ADMIN ============
export const listVehiclesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data: makes }, { data: models }, { data: years }] = await Promise.all([
      context.supabase.from("vehicle_makes").select("*").order("display_order").order("name"),
      context.supabase.from("vehicle_models").select("*").order("name"),
      context.supabase.from("vehicle_years").select("*").order("year_from"),
    ]);
    return { makes: makes ?? [], models: models ?? [], years: years ?? [] };
  });

const makeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  logo_url: z.string().nullable().optional(),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const upsertMake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => makeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, created_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("vehicle_makes").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: row, error } = await context.supabase.from("vehicle_makes").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

const modelSchema = z.object({
  id: z.string().uuid().optional(),
  make_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  body_type: z.enum(["hatchback","sedan","suv","crossover","pickup","van","commercial","motorcycle","other"]),
  is_popular: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const upsertVehicleModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => modelSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, created_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("vehicle_models").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: row, error } = await context.supabase.from("vehicle_models").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

const yearSchema = z.object({
  id: z.string().uuid().optional(),
  model_id: z.string().uuid(),
  year_from: z.number().int().min(1950).max(2100),
  year_to: z.number().int().min(1950).max(2100).nullable().optional(),
  variant_note: z.string().max(120).nullable().optional(),
  is_active: z.boolean().default(true),
});

export const upsertVehicleYear = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => yearSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, created_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("vehicle_years").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: row, error } = await context.supabase.from("vehicle_years").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

export const archiveVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "make" | "model" | "year"; id: string; archived: boolean }) =>
    z.object({ kind: z.enum(["make","model","year"]), id: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const table = data.kind === "make" ? "vehicle_makes" : data.kind === "model" ? "vehicle_models" : "vehicle_years";
    const { error } = await context.supabase.from(table).update({ archived: data.archived }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
