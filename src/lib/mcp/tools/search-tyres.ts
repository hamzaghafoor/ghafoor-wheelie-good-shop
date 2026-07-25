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
  name: "search_tyres",
  title: "Search tyres by size",
  description:
    "Search Ghafoor Motors' published tyre catalogue by size (width/profile/rim) and optional filters like brand, tyre type, run-flat, or availability.",
  inputSchema: {
    width: z.number().int().min(100).max(400).optional().describe("Tyre section width in mm (e.g. 205)."),
    profile: z.number().int().min(20).max(90).optional().describe("Aspect ratio profile (e.g. 55)."),
    rim: z.number().int().min(10).max(24).optional().describe("Rim diameter in inches (e.g. 16)."),
    brand_id: z.string().uuid().optional().describe("Optional brand UUID filter."),
    tyre_type: z.string().optional().describe("Optional tyre type filter (e.g. 'passenger', 'suv')."),
    run_flat: z.boolean().optional(),
    availability: z.string().optional().describe("Optional availability filter (e.g. 'in_stock')."),
    page: z.number().int().min(1).optional(),
    page_size: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("search_public_tyres", {
      _width: args.width,
      _profile: args.profile,
      _rim: args.rim,
      _brand_id: args.brand_id,
      _tyre_type: args.tyre_type,
      _run_flat: args.run_flat,
      _availability: args.availability,
      _page: args.page ?? 1,
      _page_size: args.page_size ?? 20,
    });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
