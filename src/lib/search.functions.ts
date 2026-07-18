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

export const searchCatalogue = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string; category?: string | null }) =>
    z.object({ q: z.string().min(1).max(120), category: z.string().nullable().optional() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient() as any;
    const term = data.q.trim().toLowerCase();
    // OR-filter across title, brand_name, part_number, size_or_spec using ilike.
    const like = `%${term}%`;
    let query = sb.from("catalogue_search")
      .select("kind, category, id, title, brand_name, brand_id, part_number, size_or_spec, short_desc, images")
      .or(`title.ilike.${like},brand_name.ilike.${like},part_number.ilike.${like},size_or_spec.ilike.${like}`)
      .limit(50);
    if (data.category) query = query.eq("category", data.category);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
