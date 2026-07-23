import { createFileRoute, redirect } from "@tanstack/react-router";

// Product Stock Importer entry point. Reuses the catalogue-import pipeline
// (server functions, RPCs, preview, commit, rollback) via URL redirect so
// there is no duplicated architecture.
export const Route = createFileRoute("/_authenticated/admin/products/import")({
  head: () => ({ meta: [{ title: "Product Stock Import | GMTL Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  beforeLoad: () => { throw redirect({ to: "/admin/catalogue/import" }); },
  component: () => null,
});
