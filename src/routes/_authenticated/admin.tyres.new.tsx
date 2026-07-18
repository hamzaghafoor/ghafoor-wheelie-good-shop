import { createFileRoute } from "@tanstack/react-router";
import { TyreWizard } from "@/components/admin/TyreWizard";
export const Route = createFileRoute("/_authenticated/admin/tyres/new")({
  component: () => <TyreWizard />,
});
