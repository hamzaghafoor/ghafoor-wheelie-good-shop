import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { useNavigate } from "@tanstack/react-router";

const search = z.object({
  cat: z.enum(["Tyres", "Lubricants"]).optional(),
});

export const Route = createFileRoute("/products")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Shop Tyres & Lubricants — Ghafoor Motors" },
      { name: "description", content: "Browse premium tyres and engine oils from Michelin, Bridgestone, Shell and more." },
      { property: "og:title", content: "Shop — Ghafoor Motors" },
      { property: "og:description", content: "Premium tyres and lubricants at fair prices." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { cat } = Route.useSearch();
  const navigate = useNavigate({ from: "/products" });
  const list = cat ? products.filter((p) => p.category === cat) : products;

  const filters: { label: string; value: "Tyres" | "Lubricants" | undefined }[] = [
    { label: "All", value: undefined },
    { label: "Tyres", value: "Tyres" },
    { label: "Lubricants", value: "Lubricants" },
  ];

  return (
    <>
      <section className="border-b border-border/60 bg-surface/50">
        <div className="container-x py-14">
          <div className="text-xs font-bold uppercase tracking-widest text-primary">Shop</div>
          <h1 className="mt-2 font-display text-5xl tracking-wide sm:text-6xl">
            {cat ?? "All products"}
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            {list.length} product{list.length === 1 ? "" : "s"} · Genuine brands · Nationwide delivery
          </p>
        </div>
      </section>

      <section className="container-x py-10">
        <div className="mb-8 flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = cat === f.value;
            return (
              <button
                key={f.label}
                onClick={() => navigate({ search: f.value ? { cat: f.value } : {} })}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-primary/60 hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </>
  );
}
