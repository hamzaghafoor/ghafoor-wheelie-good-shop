import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if ((key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function signImages<T extends { image_url: string | null }>(
  supabase: ReturnType<typeof publicClient>,
  rows: T[],
): Promise<(T & { image_signed_url: string | null })[]> {
  const out: (T & { image_signed_url: string | null })[] = [];
  for (const r of rows) {
    let signed: string | null = null;
    if (r.image_url) {
      const { data } = await supabase.storage.from("tyre-images").createSignedUrl(r.image_url, SIGNED_URL_TTL);
      signed = data?.signedUrl ?? null;
    }
    out.push({ ...r, image_signed_url: signed });
  }
  return out;
}

export const listPublishedTyres = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("tyre_products")
    .select("id, brand, model, size, category, price, currency, in_stock, image_url, description, features, vehicles")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return await signImages(sb, data ?? []);
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listAllTyresAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("tyre_products")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const sb = publicClient();
    return await signImages(sb, data ?? []);
  });

export const getTyreAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("tyre_products").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    const sb = publicClient();
    const [withSigned] = await signImages(sb, [row]);
    return withSigned;
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  brand: z.string().min(1),
  model: z.string().min(1),
  size: z.string().min(1),
  category: z.string().min(1),
  price: z.number().nullable().optional(),
  in_stock: z.boolean(),
  image_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  features: z.array(z.string()).default([]),
  vehicles: z.array(z.string()).default([]),
  status: z.enum(["draft", "published", "archived"]),
});

export const upsertTyreAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { ...data, created_by: context.userId };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("tyre_products").update(payload).eq("id", data.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) throw new Error("Update did not save any row.");
      return { ok: true as const, id: row.id };
    }
    const { data: row, error } = await context.supabase
      .from("tyre_products").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Insert did not return a row.");
    return { ok: true as const, id: row.id };
  });

export const setTyreStatusAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "published", "archived"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("tyre_products").update({ status: data.status }).eq("id", data.id).select("id, status").maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Status change did not save.");
    return { ok: true as const, status: row.status };
  });
