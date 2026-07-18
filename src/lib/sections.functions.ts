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

export const listPublishedHomepageSections = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb.from("homepage_sections")
    .select("id, type, name, config, display_order, start_at, end_at")
    .eq("is_visible", true).eq("archived", false).eq("status", "published")
    .order("display_order");
  if (error) throw new Error(error.message);
  const now = Date.now();
  return (data ?? []).filter((s) => {
    if (s.start_at && now < new Date(s.start_at).getTime()) return false;
    if (s.end_at && now > new Date(s.end_at).getTime()) return false;
    return true;
  });
});

export const listSectionsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("homepage_sections").select("*").order("display_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSectionAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from("homepage_sections").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Section not found");
    return row;
  });

const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.string(),
  name: z.string().min(1),
  config: z.record(z.any()).default({}),
  display_order: z.number().int().default(0),
  is_visible: z.boolean().default(true),
  status: z.enum(["draft", "published", "archived", "scheduled"]).default("draft"),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
});

export const upsertSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sectionSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, updated_by: context.userId };
    if (data.id) {
      const { data: row, error } = await context.supabase.from("homepage_sections").update(payload).eq("id", data.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) throw new Error("No row returned"); return { ok: true as const, id: (row as any).id };
    }
    const { data: row, error } = await context.supabase.from("homepage_sections").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("No row returned"); return { ok: true as const, id: (row as any).id };
  });

export const setSectionVisible = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_visible: boolean }) => z.object({ id: z.string().uuid(), is_visible: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("homepage_sections").update({ is_visible: data.is_visible }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setSectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "draft" | "published" | "archived" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "published", "archived"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { status: data.status };
    if (data.status === "archived") patch.archived = true;
    if (data.status === "published") patch.archived = false;
    const { error } = await context.supabase.from("homepage_sections").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const reorderSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orders: { id: string; display_order: number }[] }) =>
    z.object({ orders: z.array(z.object({ id: z.string().uuid(), display_order: z.number().int() })) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    for (const o of data.orders) {
      await context.supabase.from("homepage_sections").update({ display_order: o.display_order }).eq("id", o.id);
    }
    return { ok: true as const };
  });

export const duplicateSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: src, error } = await context.supabase.from("homepage_sections").select("*").eq("id", data.id).maybeSingle();
    if (error || !src) throw new Error("Source not found");
    const { id, created_at, updated_at, ...rest } = src as any;
    const { data: row, error: e2 } = await context.supabase.from("homepage_sections")
      .insert({ ...rest, name: `${rest.name} (copy)`, status: "draft", display_order: (rest.display_order ?? 0) + 1, updated_by: context.userId })
      .select().maybeSingle();
    if (e2) throw new Error(e2.message);
    if (!row) throw new Error("No row returned"); return { ok: true as const, id: (row as any).id };
  });
