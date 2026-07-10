import { Plus } from "lucide-react";
import type { Product } from "@/lib/products";
import { formatPKR } from "@/lib/products";
import { useCart } from "@/lib/cart";

export function ProductCard({ product }: { product: Product }) {
  const { add, setOpen } = useCart();
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-surface transition hover:border-primary/60">
      <div className="relative aspect-square overflow-hidden bg-background">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
          width={800}
          height={800}
        />
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-sm bg-primary px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary-foreground">
            {product.badge}
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-sm border border-border/70 bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur">
          {product.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {product.brand}
        </div>
        <h3 className="mt-1 font-display text-xl leading-tight tracking-wide">{product.name}</h3>
        {product.size && (
          <div className="mt-1 text-sm text-muted-foreground">{product.size}</div>
        )}
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="font-display text-2xl text-primary">{formatPKR(product.price)}</div>
          <button
            onClick={() => { add(product.id, 1); setOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>
    </article>
  );
}
