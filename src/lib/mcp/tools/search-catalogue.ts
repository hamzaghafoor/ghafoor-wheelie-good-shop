import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_catalogue",
  title: "Search product catalogue",
  description:
    "Search Ghafoor Motors' published product catalogue (lubricants, filters, additives, coolants, car-care, accessories, etc.). Returns brand, name, price and availability.",
  inputSchema: {
    query: z.string().min(1).describe("Free-text query — brand, product name, viscosity, part type."),
    category: z.string().optional().describe("Optional category slug filter (e.g. 'engine-oil')."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results, default 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("search_public_catalogue", {
      _q: query,
      _category: category ?? undefined,
      _limit: limit ?? 20,
      _offset: 0,
    });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
