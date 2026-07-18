import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const BIZ_ID = "00000000-0000-0000-0000-000000000001";

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

export const getBusinessInfo = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb.from("business_info").select("*").eq("id", BIZ_ID).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});

const bizSchema = z.object({
  name: z.string().min(1),
  logo_url: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  maps_url: z.string().nullable().optional(),
  hours: z.record(z.any()).default({}),
  holiday_hours: z.record(z.any()).default({}),
  temp_closure: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  google_review_url: z.string().nullable().optional(),
  currency: z.string().default("PKR"),
  timezone: z.string().default("Asia/Karachi"),
});

export const updateBusinessInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bizSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("business_info")
      .update({ ...data, updated_by: context.userId }).eq("id", BIZ_ID);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
