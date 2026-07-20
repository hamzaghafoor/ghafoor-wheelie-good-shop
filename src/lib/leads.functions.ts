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

const leadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(40),
  message: z.string().max(2000).nullable().optional(),
  preferred_contact: z.enum(["whatsapp", "call", "either"]).default("whatsapp"),
  tyre_size: z.string().max(60).nullable().optional(),
  vehicle_make: z.string().max(80).nullable().optional(),
  vehicle_model: z.string().max(80).nullable().optional(),
  vehicle_year: z.string().max(20).nullable().optional(),
  source_page: z.string().max(300).nullable().optional(),
  search_context: z.record(z.any()).default({}),
  variant_id: z.string().uuid().nullable().optional(),
  model_id: z.string().uuid().nullable().optional(),
  lead_type: z.enum(["general","tyre_no_results","catalogue_no_results","vehicle_no_match","callback"]).default("general"),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => leadSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { error, data: row } = await sb.from("leads").insert(data as any).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as any)?.id };
  });

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string } = {}) => z.object({ status: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q: any = (context.supabase as any).from("leads").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["new","contacted","qualified","closed","lost"]).optional(),
    admin_notes: z.string().max(4000).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = {}; if (data.status) patch.status = data.status; if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await (context.supabase as any).from("leads").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
