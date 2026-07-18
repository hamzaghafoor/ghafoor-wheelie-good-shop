import { createFileRoute } from "@tanstack/react-router";
import { TyreEditor } from "@/components/admin/TyreEditor";

export const Route = createFileRoute("/_authenticated/admin/tyres/new")({
  component: () => <TyreEditor />,
});
