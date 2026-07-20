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

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ============================== REVIEWS ==============================
export const listReviewsPublic = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("reviews").select("id, author_name, rating, body, source, review_date, display_order").eq("published", true).order("display_order").order("review_date", { ascending: false }).limit(50);
  return data ?? [];
});

export const listReviewsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("reviews").select("*").order("display_order").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const GOOGLE_URL_RE = /^https:\/\/(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|g\.page|search\.google\.[a-z.]+)\//i;

const reviewSchema = z.object({
  id: z.string().uuid().optional(),
  author_name: z.string().trim().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(1).max(4000),
  source: z.enum(["manual", "google", "facebook", "other"]).default("manual"),
  external_id: z.string().max(200).optional().nullable(),
  external_url: z.string().url().max(500).optional().nullable(),
  review_date: z.string().optional().nullable(),
  published: z.boolean().default(false),
  display_order: z.number().int().default(0),
}).superRefine((v, ctx) => {
  if (v.source === "google") {
    if (!v.external_url || !GOOGLE_URL_RE.test(v.external_url)) {
      ctx.addIssue({ code: "custom", path: ["external_url"], message: "Google reviews require a valid HTTPS Google source URL" });
    }
    if (v.body.trim().length < 10) {
      ctx.addIssue({ code: "custom", path: ["body"], message: "Google reviews require genuine review text (min 10 chars)" });
    }
  }
});

export const upsertReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reviewSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    if (id) {
      const { data: row, error } = await context.supabase.from("reviews").update(rest).eq("id", id).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("reviews").insert({ ...rest, created_by: context.userId }).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================== ARTICLES ==============================
export const listArticlesPublic = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("articles").select("id, slug, title, excerpt, cover_image_path, tags, published_at, display_order").eq("published", true).order("display_order").order("published_at", { ascending: false }).limit(100);
  return data ?? [];
});

export const getArticlePublic = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb.from("articles").select("id, slug, title, excerpt, body_md, cover_image_path, tags, seo_title, seo_description, published_at").eq("slug", data.slug).eq("published", true).maybeSingle();
    return row ?? null;
  });

export const listArticlesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("articles").select("*").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getArticleAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from("articles").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const articleSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().max(200).optional(),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional().nullable(),
  body_md: z.string().default(""),
  cover_image_path: z.string().max(500).optional().nullable(),
  tags: z.array(z.string()).default([]),
  seo_title: z.string().max(200).optional().nullable(),
  seo_description: z.string().max(500).optional().nullable(),
  published: z.boolean().default(false),
  display_order: z.number().int().default(0),
});

export const upsertArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => articleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const slug = (rest.slug && rest.slug.length > 0 ? rest.slug : slugify(rest.title)).slice(0, 200);
    const payload: any = { ...rest, slug };
    if (rest.published) payload.published_at = new Date().toISOString();
    if (id) {
      const { data: row, error } = await context.supabase.from("articles").update(payload).eq("id", id).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("articles").insert({ ...payload, created_by: context.userId }).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================== VIDEOS ==============================
export const listVideosPublic = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("videos").select("id, title, provider, video_ref, thumbnail_url, description, display_order").eq("published", true).order("display_order").order("created_at", { ascending: false }).limit(50);
  return data ?? [];
});

export const listVideosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("videos").select("*").order("display_order").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

function parseVideoRef(provider: "youtube" | "vimeo", raw: string): string | null {
  const s = raw.trim();
  if (/^[A-Za-z0-9_-]{6,64}$/.test(s)) return s;
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (provider === "youtube") {
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return /^[A-Za-z0-9_-]{6,64}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{6,64}$/.test(v)) return v;
      const m = u.pathname.match(/^\/(embed|shorts|v)\/([A-Za-z0-9_-]{6,64})/);
      if (m) return m[2];
    }
    return null;
  }
  if (provider === "vimeo") {
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const m = u.pathname.match(/(\d{6,20})/);
      if (m) return m[1];
    }
    return null;
  }
  return null;
}

const videoSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  provider: z.enum(["youtube", "vimeo"]).default("youtube"),
  video_ref: z.string().trim().min(1).max(500),
  thumbnail_url: z.string().url().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  published: z.boolean().default(false),
  display_order: z.number().int().default(0),
}).transform((v, ctx) => {
  const ref = parseVideoRef(v.provider, v.video_ref);
  if (!ref) {
    ctx.addIssue({ code: "custom", path: ["video_ref"], message: `Invalid ${v.provider} URL or ID. Paste a YouTube or Vimeo link.` });
    return z.NEVER;
  }
  return { ...v, video_ref: ref };
});

export const upsertVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => videoSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    if (id) {
      const { data: row, error } = await context.supabase.from("videos").update(rest).eq("id", id).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("videos").insert({ ...rest, created_by: context.userId }).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
