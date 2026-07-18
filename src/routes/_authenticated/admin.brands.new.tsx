import { createFileRoute } from "@tanstack/react-router";
import { BrandEditor } from "@/components/admin/BrandEditor";
export const Route = createFileRoute("/_authenticated/admin/brands/new")({
  component: () => <BrandEditor />,
});
