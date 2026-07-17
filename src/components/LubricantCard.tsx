import { MessageCircle } from "lucide-react";
import type { Lubricant } from "@/lib/lubricants";
import { waLink } from "@/lib/business";

export function LubricantCard({ item }: { item: Lubricant }) {
  const msg = `Assalam-o-Alaikum, please check price and availability for ${item.brand} ${item.name} (${item.spec}, ${item.packSize}).`;
  return (
    <article className="card-surface flex flex-col overflow-hidden">
      <div className="relative aspect-square bg-surface-2">
        <img src={item.image} alt={item.name} loading="lazy" width={800} height={800} className="h-full w-full object-contain p-6" />
        <span className="absolute left-3 top-3 rounded-full bg-ink/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          {item.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{item.brand}</div>
        <h3 className="mt-0.5 font-display text-lg text-ink">{item.name}</h3>
        <div className="mt-1 text-sm text-foreground/80">{item.spec} • {item.packSize}</div>
        <div className="mt-1 text-xs text-muted-foreground">Suitable for: {item.vehicleType}</div>
        <a href={waLink(msg)} target="_blank" rel="noreferrer" className="btn-primary mt-4 text-xs">
          <MessageCircle className="h-3.5 w-3.5" /> Check Price & Availability
        </a>
      </div>
    </article>
  );
}
