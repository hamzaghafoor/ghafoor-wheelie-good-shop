import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/media")({
  component: () => (
    <div>
      <h1 className="font-display text-2xl">Media Library</h1>
      <p className="mt-1 text-sm text-muted-foreground">Central library of tyre and brand images.</p>
      <div className="card-surface mt-6 bg-white p-8 text-center text-sm text-muted-foreground">
        Media library coming in the next stage. For now, upload images directly when creating a tyre or brand.
      </div>
    </div>
  ),
});
