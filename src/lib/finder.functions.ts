import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
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

// ============ SIZE CASCADE ============
export const finderWidths = createServerFn({ method: "GET" }).handler(async () => {
  const sb: any = publicClient();
  const { data, error } = await sb.rpc("get_public_tyre_widths");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.width as number);
});

export const finderProfiles = createServerFn({ method: "GET" })
  .inputValidator((d: { width: number }) => z.object({ width: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const sb: any = publicClient();
    const { data: rows, error } = await sb.rpc("get_public_tyre_profiles", { _width: data.width });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => r.profile as number);
  });

export const finderRims = createServerFn({ method: "GET" })
  .inputValidator((d: { width: number; profile: number }) => z.object({ width: z.number().int().positive(), profile: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const sb: any = publicClient();
    const { data: rows, error } = await sb.rpc("get_public_tyre_rims", { _width: data.width, _profile: data.profile });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => Number(r.rim));
  });

// ============ VEHICLE CASCADE ============
export const finderMakes = createServerFn({ method: "GET" }).handler(async () => {
  const sb: any = publicClient();
  const { data, error } = await sb.rpc("get_public_vehicle_makes");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const finderModels = createServerFn({ method: "GET" })
  .inputValidator((d: { make_id: string }) => z.object({ make_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb: any = publicClient();
    const { data: rows, error } = await sb.rpc("get_public_vehicle_models", { _make_id: data.make_id });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const finderYears = createServerFn({ method: "GET" })
  .inputValidator((d: { model_id: string }) => z.object({ model_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb: any = publicClient();
    const { data: rows, error } = await sb.rpc("get_public_vehicle_years", { _model_id: data.model_id });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const finderConfigurations = createServerFn({ method: "GET" })
  .inputValidator((d: { model_id: string; year?: number | null }) => z.object({ model_id: z.string().uuid(), year: z.number().int().nullable().optional() }).parse(d))
  .handler(async ({ data }) => {
    const sb: any = publicClient();
    const { data: rows, error } = await sb.rpc("get_public_vehicle_configurations", { _model_id: data.model_id, _year: data.year ?? null });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const finderOemSizes = createServerFn({ method: "GET" })
  .inputValidator((d: { configuration_id: string }) => z.object({ configuration_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb: any = publicClient();
    const { data: rows, error } = await sb.rpc("get_public_vehicle_oem_tyre_sizes", { _configuration_id: data.configuration_id });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ PAGINATED SEARCH ============
const sortEnum = z.enum(["relevance", "price_asc", "price_desc", "availability"]);
export const searchTyres = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    width: z.number().int().nullable().optional(),
    profile: z.number().int().nullable().optional(),
    rim: z.number().nullable().optional(),
    brand_id: z.string().uuid().nullable().optional(),
    availability: z.string().max(24).nullable().optional(),
    tyre_type: z.string().max(24).nullable().optional(),
    run_flat: z.boolean().nullable().optional(),
    sort: sortEnum.default("relevance"),
    page: z.number().int().positive().default(1),
    page_size: z.number().int().positive().max(100).default(24),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb: any = publicClient();
    const { data: rows, error } = await sb.rpc("search_public_tyres", {
      _width: data.width ?? null,
      _profile: data.profile ?? null,
      _rim: data.rim ?? null,
      _brand_id: data.brand_id ?? null,
      _availability: data.availability ?? null,
      _tyre_type: data.tyre_type ?? null,
      _run_flat: data.run_flat ?? null,
      _sort: data.sort,
      _page: data.page,
      _page_size: data.page_size,
    });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const total = list.length ? Number(list[0].total_count) : 0;
    return { rows: list, total, page: data.page, page_size: data.page_size };
  });
