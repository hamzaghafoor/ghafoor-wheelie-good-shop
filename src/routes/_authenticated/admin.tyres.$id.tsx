import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTyreAdmin } from "@/lib/tyres.functions";
import { TyreEditor } from "@/components/admin/TyreEditor";

export const Route = createFileRoute("/_authenticated/admin/tyres/$id")({
  component: EditTyre,
});

function EditTyre() {
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getTyreAdmin);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-tyre", id],
    queryFn: () => fetchOne({ data: { id } }),
  });
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-sm text-red-600">Error: {(error as Error).message}</div>;
  return <TyreEditor initial={data as any} />;
}
