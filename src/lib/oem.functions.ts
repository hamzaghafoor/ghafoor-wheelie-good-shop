import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// ---------- LIST ----------
export const getModelWithConfigs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { modelId: string }) => z.object({ modelId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [{ data: model }, { data: make }, { data: configs }] = await Promise.all([
      context.supabase.from("vehicle_models").select("*").eq("id", data.modelId).maybeSingle(),
      Promise.resolve({ data: null as any }),
      context.supabase.from("vehicle_configurations").select("*").eq("model_id", data.modelId).order("archived").order("market").order("pk_year_from", { ascending: false, nullsFirst: false }).order("trim_name"),
    ]);
    if (!model) throw new Error("Model not found");
    const { data: mk } = await context.supabase.from("vehicle_makes").select("id, name, slug").eq("id", (model as any).make_id).maybeSingle();
    return { model, make: mk, configs: configs ?? [] };
  });

export const getConfigurationDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { configId: string }) => z.object({ configId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [{ data: config }, { data: tyres }, { data: oils }] = await Promise.all([
      context.supabase.from("vehicle_configurations").select("*").eq("id", data.configId).maybeSingle(),
      context.supabase.from("vehicle_oem_tyre_specs").select("*").eq("configuration_id", data.configId).order("archived").order("is_primary", { ascending: false }).order("updated_at", { ascending: false }),
      context.supabase.from("vehicle_oem_oil_specs").select("*").eq("configuration_id", data.configId).order("archived").order("is_primary", { ascending: false }).order("updated_at", { ascending: false }),
    ]);
    if (!config) throw new Error("Configuration not found");
    const { data: model } = await context.supabase.from("vehicle_models").select("id, name, slug, make_id").eq("id", (config as any).model_id).maybeSingle();
    const { data: make } = model ? await context.supabase.from("vehicle_makes").select("id, name, slug").eq("id", (model as any).make_id).maybeSingle() : { data: null };
    return { config, model, make, tyreSpecs: tyres ?? [], oilSpecs: oils ?? [] };
  });

// ---------- CONFIGURATION ----------
const FUEL = ["petrol","diesel","hybrid","phev","ev","cng","lpg"] as const;
const MARKET = ["PK","GLOBAL","JP_IMPORT","OTHER_IMPORT"] as const;
const SOURCE = ["manufacturer","owner_manual","official_dealer","trusted_publication","community","other"] as const;
const STATUS = ["needs_verification","partial","verified","disputed"] as const;
const LAYOUT = ["same","staggered"] as const;

const configSchema = z.object({
  id: z.string().uuid().optional(),
  model_id: z.string().uuid(),
  trim_name: z.string().max(120).nullable().optional(),
  engine_code: z.string().max(80).nullable().optional(),
  engine_name: z.string().max(120).nullable().optional(),
  chassis_code: z.string().max(80).nullable().optional(),
  engine_capacity_cc: z.number().int().min(50).max(12000).nullable().optional(),
  fuel_type: z.enum(FUEL).nullable().optional(),
  transmission: z.string().max(60).nullable().optional(),
  drivetrain: z.string().max(60).nullable().optional(),
  body_type: z.string().max(60).nullable().optional(),
  market: z.enum(MARKET).default("PK"),
  production_year_from: z.number().int().min(1950).max(2100).nullable().optional(),
  production_year_to: z.number().int().min(1950).max(2100).nullable().optional(),
  pk_year_from: z.number().int().min(1950).max(2100).nullable().optional(),
  pk_year_to: z.number().int().min(1950).max(2100).nullable().optional(),
  source_type: z.enum(SOURCE).nullable().optional(),
  source_url: z.string().max(500).nullable().optional(),
  source_notes: z.string().max(2000).nullable().optional(),
  admin_notes: z.string().max(2000).nullable().optional(),
  verification_status: z.enum(STATUS).default("needs_verification"),
});

export const upsertConfiguration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => configSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, updated_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("vehicle_configurations").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    payload.created_by = context.userId;
    const { data: row, error } = await context.supabase.from("vehicle_configurations").insert(payload).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

// ---------- TYRE SPEC ----------
const tyreSpecSchema = z.object({
  id: z.string().uuid().optional(),
  configuration_id: z.string().uuid(),
  layout: z.enum(LAYOUT).default("same"),
  front_width: z.number().int().min(100).max(500),
  front_profile: z.number().int().min(20).max(90),
  front_rim: z.number().int().min(10).max(26),
  front_load_index: z.number().int().min(0).max(300).nullable().optional(),
  front_speed_rating: z.string().max(4).nullable().optional(),
  rear_width: z.number().int().min(100).max(500).nullable().optional(),
  rear_profile: z.number().int().min(20).max(90).nullable().optional(),
  rear_rim: z.number().int().min(10).max(26).nullable().optional(),
  rear_load_index: z.number().int().min(0).max(300).nullable().optional(),
  rear_speed_rating: z.string().max(4).nullable().optional(),
  is_primary: z.boolean().default(false),
  source_type: z.enum(SOURCE).nullable().optional(),
  source_url: z.string().max(500).nullable().optional(),
  source_notes: z.string().max(2000).nullable().optional(),
  admin_notes: z.string().max(2000).nullable().optional(),
  verification_status: z.enum(STATUS).default("needs_verification"),
});

export const upsertTyreSpec = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tyreSpecSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, updated_by: context.userId };
    if (data.is_primary) {
      await context.supabase.from("vehicle_oem_tyre_specs").update({ is_primary: false }).eq("configuration_id", data.configuration_id).neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    }
    if (data.id) {
      const { error } = await context.supabase.from("vehicle_oem_tyre_specs").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    payload.created_by = context.userId;
    const { data: row, error } = await context.supabase.from("vehicle_oem_tyre_specs").insert(payload).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

// ---------- OIL SPEC ----------
const oilSpecSchema = z.object({
  id: z.string().uuid().optional(),
  configuration_id: z.string().uuid(),
  sae_grade: z.string().max(30).nullable().optional(),
  api_standard: z.string().max(30).nullable().optional(),
  acea_standard: z.string().max(30).nullable().optional(),
  ilsac_standard: z.string().max(30).nullable().optional(),
  jaso_standard: z.string().max(30).nullable().optional(),
  oem_approvals: z.array(z.string()).nullable().optional(),
  capacity_with_filter_l: z.number().min(0).max(50).nullable().optional(),
  capacity_without_filter_l: z.number().min(0).max(50).nullable().optional(),
  change_interval_km: z.number().int().min(0).max(100000).nullable().optional(),
  change_interval_months: z.number().int().min(0).max(120).nullable().optional(),
  is_primary: z.boolean().default(false),
  source_type: z.enum(SOURCE).nullable().optional(),
  source_url: z.string().max(500).nullable().optional(),
  source_notes: z.string().max(2000).nullable().optional(),
  admin_notes: z.string().max(2000).nullable().optional(),
  verification_status: z.enum(STATUS).default("needs_verification"),
});

export const upsertOilSpec = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => oilSpecSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, updated_by: context.userId };
    if (data.is_primary) {
      await context.supabase.from("vehicle_oem_oil_specs").update({ is_primary: false }).eq("configuration_id", data.configuration_id).neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    }
    if (data.id) {
      const { error } = await context.supabase.from("vehicle_oem_oil_specs").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    payload.created_by = context.userId;
    const { data: row, error } = await context.supabase.from("vehicle_oem_oil_specs").insert(payload).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any).id };
  });

// ---------- ARCHIVE ----------
export const archiveOemRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "config" | "tyre" | "oil"; id: string; archived: boolean }) =>
    z.object({ kind: z.enum(["config","tyre","oil"]), id: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const table = data.kind === "config" ? "vehicle_configurations" : data.kind === "tyre" ? "vehicle_oem_tyre_specs" : "vehicle_oem_oil_specs";
    const { error } = await context.supabase.from(table).update({ archived: data.archived, updated_by: context.userId }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
