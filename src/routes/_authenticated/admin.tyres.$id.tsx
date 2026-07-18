import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCatalogueAdmin, getModelAdmin } from "@/lib/catalogue.functions";
import { VariantEditor } from "@/components/admin/VariantEditor";

export const Route = createFileRoute("/_authenticated/admin/tyres/$id")({
  component: EditVariant,
});

function EditVariant() {
  const { id } = Route.useParams();
  const list = useServerFn(listCatalogueAdmin);
  const q = useQuery({ queryKey: ["adm-cat"], queryFn: () => list() });
  const variant = q.data?.variants.find((v: any) => v.id === id);
  const model = variant ? q.data?.models.find((m: any) => m.id === variant.model_id) : null;
  const brand = model ? q.data?.brands.find((b: any) => b.id === model.brand_id) : null;

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!variant || !model || !brand) return <div className="text-sm text-red-600">Tyre not found.</div>;
  return <VariantEditor variant={variant} model={model} brand={brand} />;
}
