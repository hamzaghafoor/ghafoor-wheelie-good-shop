import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBrandAdmin } from "@/lib/brands.functions";
import { BrandEditor } from "@/components/admin/BrandEditor";

export const Route = createFileRoute("/_authenticated/admin/brands/$id")({
  component: EditBrand,
});

function EditBrand() {
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getBrandAdmin);
  const { data, isLoading, error } = useQuery({ queryKey: ["adm-brand", id], queryFn: () => fetchOne({ data: { id } }) });
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-sm text-red-600">{(error as Error).message}</div>;
  return <BrandEditor initial={data as any} />;
}
