import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getVehicleRecommendationsPublic } from "@/lib/recommendations.functions";
import { waLink } from "@/lib/business";
import { MessageCircle } from "lucide-react";

type Props = {
  modelId: string;
  configurationId?: string | null;
  vehicleLabel?: string;
  categories?: string[];
  staleDays?: number;
};

const CATEGORY_TITLES: Record<string, string> = {
  tyres: "Recommended Tyres",
  lubricants: "Recommended Engine Oils",
  filters: "Recommended Filters",
  maintenance_parts: "Recommended Maintenance Products",
  car_care: "Recommended Car Care",
  additives: "Recommended Additives",
  accessories: "Recommended Accessories",
  services: "Recommended Services",
};

export function VehicleRecommendations({ modelId, configurationId, vehicleLabel, categories, staleDays = 30 }: Props) {
  const load = useServerFn(getVehicleRecommendationsPublic);
  const q = useQuery({
    queryKey: ["public-recs", modelId, configurationId ?? null],
    queryFn: () => load({ data: { model_id: modelId, configuration_id: configurationId ?? null } }),
    enabled: !!modelId,
  });

  const rows = (q.data ?? []) as any[];
  const filtered = categories?.length ? rows.filter((r) => categories.includes(r.category)) : rows;

  const grouped: Record<string, any[]> = {};
  filtered.forEach((r) => { (grouped[r.category] ||= []).push(r); });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading recommendations…</p>;
  if (Object.keys(grouped).length === 0) {
    return (
      <div className="card-surface bg-white p-6 text-sm text-muted-foreground">
        No curated recommendations yet for this vehicle. <span className="text-ink">Ask Our Expert for Compatible Options.</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat}>
          <h2 className="font-display text-xl text-ink">{CATEGORY_TITLES[cat] ?? cat}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => <RecCard key={r.id} r={r} vehicleLabel={vehicleLabel} staleDays={staleDays} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function RecCard({ r, vehicleLabel, staleDays }: { r: any; vehicleLabel?: string; staleDays: number }) {
  const img = r.family_images?.main?.url || null;
  const stale = !r.family_availability_verified_at ||
    (Date.now() - new Date(r.family_availability_verified_at).getTime()) / 86400000 > staleDays;
  const showPrice = r.family_price_mode === "fixed" && r.family_price != null;
  const msg = `Assalam-o-Alaikum, please share options and today's price for ${r.family_name}${vehicleLabel ? ` for my ${vehicleLabel}` : ""}.`;
  return (
    <div className="card-surface overflow-hidden bg-white">
      <div className="aspect-[4/3] overflow-hidden bg-surface-2">
        {img ? <img src={img} alt={r.family_name} loading="lazy" className="h-full w-full object-cover" /> :
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{r.brand_name}</div>}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{r.label}</span>
          <span className="text-muted-foreground">{r.brand_name}</span>
        </div>
        <h3 className="mt-1 font-display text-lg text-ink line-clamp-2">{r.family_name}</h3>
        {r.family_short_desc && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.family_short_desc}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{r.active_variant_count} pack{r.active_variant_count === 1 ? "" : "s"} available</p>
        <div className="mt-2 text-sm">
          {showPrice ? (
            <div><span className="font-display text-lg text-ink">Rs. {Number(r.family_price).toLocaleString()}</span>{r.family_previous_price && <span className="ml-2 text-xs text-muted-foreground line-through">Rs. {Number(r.family_previous_price).toLocaleString()}</span>}</div>
          ) : (
            <div className="text-xs text-muted-foreground">Contact for today's price</div>
          )}
          {stale && <div className="mt-1 text-[11px] text-amber-700">Please confirm today's availability</div>}
        </div>
        <div className="mt-3 flex gap-2">
          <Link to="/search" search={{ q: r.family_name } as any} className="flex-1 rounded-full border border-border px-3 py-1.5 text-center text-xs font-medium hover:border-primary hover:text-primary">
            View details
          </Link>
          <a href={waLink(msg)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90">
            <MessageCircle className="h-3 w-3" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
