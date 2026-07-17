import { AlertCircle } from "lucide-react";
import type { Service } from "@/lib/services";
import { waLink } from "@/lib/business";

export function ServiceCard({ service }: { service: Service }) {
  const msg = `Assalam-o-Alaikum, I would like to book ${service.name}. Please share the next available slot.`;
  return (
    <article className="card-surface overflow-hidden">
      <div className="aspect-[16/10] overflow-hidden bg-surface-2">
        <img src={service.image} alt={service.name} loading="lazy" width={1200} height={750} className="h-full w-full object-cover" />
      </div>
      <div className="p-5">
        <h3 className="font-display text-xl text-ink">{service.name}</h3>
        <p className="mt-1 text-sm text-foreground/70">{service.description}</p>
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 text-primary" /> Common warning signs
          </div>
          <ul className="mt-2 space-y-1 text-sm text-foreground/80">
            {service.signs.map((s) => <li key={s} className="flex gap-2"><span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-primary" />{s}</li>)}
          </ul>
        </div>
        <a href={waLink(msg)} target="_blank" rel="noreferrer" className="btn-primary mt-5 w-full text-sm">
          Book {service.name}
        </a>
      </div>
    </article>
  );
}
