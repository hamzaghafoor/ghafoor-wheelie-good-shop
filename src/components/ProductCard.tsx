import { MessageCircle, Phone } from "lucide-react";
import type { Tyre } from "@/lib/tyres";
import { telLink, waLink } from "@/lib/business";

export function ProductCard({ tyre }: { tyre: Tyre }) {
  const size = tyre.sizes[0];
  const askMsg = `Assalam-o-Alaikum, I am checking the availability and current price of ${tyre.brand} ${tyre.model}, size ${size}. Please share suitable options.`;

  return (
    <article className="card-surface group flex flex-col overflow-hidden transition hover:border-primary/50">
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        <img src={tyre.image} alt={`${tyre.brand} ${tyre.model}`} loading="lazy" width={800} height={800} className="h-full w-full object-contain p-6 transition duration-500 group-hover:scale-105" />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tyre.inStock ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
          {tyre.inStock ? "In Stock" : "Check Availability"}
        </span>
        <span className="absolute right-3 top-3 rounded-full border border-border bg-surface/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
          {tyre.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{tyre.brand}</div>
        <h3 className="mt-0.5 font-display text-lg leading-tight text-ink">{tyre.model}</h3>
        <div className="mt-1 text-sm font-medium text-foreground/80">{tyre.sizes.join(" • ")}</div>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {tyre.features.slice(0, 3).map((f) => (
            <li key={f} className="flex items-start gap-1.5">
              <span className="mt-1 h-1 w-1 flex-none rounded-full bg-primary" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={waLink(askMsg)} target="_blank" rel="noreferrer" className="btn-primary text-xs">
            <MessageCircle className="h-3.5 w-3.5" /> Get Price
          </a>
          <a href={telLink()} className="btn-outline text-xs">
            <Phone className="h-3.5 w-3.5" /> Call
          </a>
        </div>
      </div>
    </article>
  );
}
