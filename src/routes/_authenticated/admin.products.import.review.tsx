import { createFileRoute, redirect } from "@tanstack/react-router";

// Product Stock Import Review — reuses the existing catalogue review queue.
export const Route = createFileRoute("/_authenticated/admin/products/import/review")({
  head: () => ({ meta: [{ title: "Product Import Review | GMTL Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  beforeLoad: () => { throw redirect({ to: "/admin/catalogue/review" }); },
  component: () => null,
});
