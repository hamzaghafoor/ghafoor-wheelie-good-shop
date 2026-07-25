import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchCatalogueTool from "./tools/search-catalogue";
import searchTyresTool from "./tools/search-tyres";

// OAuth issuer MUST be the direct Supabase host, not the .lovable.cloud proxy.
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "gmtl-mcp",
  title: "Ghafoor Motors Tyres & Lubricants",
  version: "0.1.0",
  instructions:
    "Tools for searching Ghafoor Motors' published tyre and product catalogue. Use `search_tyres` to look up tyres by size, and `search_catalogue` for lubricants, filters, additives, coolants, car-care and accessories.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchCatalogueTool, searchTyresTool],
});
