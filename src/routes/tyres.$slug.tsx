import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Phone, ChevronLeft } from "lucide-react";
import { getTyreModelBySlug } from "@/lib/compatibility.functions";
import { listVehiclesPublic } from "@/lib/vehicles.functions";
import { waTyreLink } from "@/lib/whatsapp";
import { business, telLink } from "@/lib/business";
import { track } from "@/lib/analytics";
import { LeadForm } from "@/components/LeadForm";
import { BookingButton } from "@/components/BookingButton";


export const Route = createFileRoute("/tyres/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g," ")} | Tyres | Ghafoor Motors` },
      { name: "description", content: "View sizes, specifications and today's price. Get WhatsApp confirmation from Ghafoor Motors, PECHS Karachi." },
    ],
  }),
  component: DetailPage,
  errorComponent: ({ error }) => <div className="container-x py-20 text-center"><p className="text-red-600">{error.message}</p><Link to="/tyres" className="btn-outline mt-4">Back to tyres</Link></div>,
  notFoundComponent: () => <div className="container-x py-20 text-center">Tyre not found. <Link to="/tyres" className="text-primary underline">Browse all</Link></div>,
});

function DetailPage() {
  const { slug } = Route.useParams();
  const fetch = useServerFn(getTyreModelBySlug);
  const fetchV = useServerFn(listVehiclesPublic);
  const { data, isLoading, error } = useQuery({ queryKey: ["tyre-detail", slug], queryFn: () => fetch({ data: { slug } }) });
  const { data: veh } = useQuery({ queryKey: ["pub-vehicles"], queryFn: () => fetchV() });

  const [variantId, setVariantId] = useState<string>("");
  useEffect(() => {
    if (data?.variants?.length && !variantId) setVariantId(data.variants[0].id);
    if (data) track("tyre_view", { slug });
  }, [data, slug]);

  const model = data?.model;
  const brand = data?.brand;
  const variants = data?.variants ?? [];
  const current = variants.find(v => v.id === variantId) ?? variants[0];

  const compatVehicles = useMemo(() => {
    if (!veh) return [] as { make?: string; model?: string }[];
    const makes = new Map(veh.makes.map(m => [m.id, m.name]));
    const models = new Map(veh.models.map(m => [m.id, m.name]));
    // Prefer variant-level compat for the currently selected variant.
    const vc = (data?.variantCompat ?? []).filter((c: any) => c.variant_id === current?.id);
    if (vc.length) {
      const seen = new Set<string>();
      return vc.map((c: any) => ({ make: makes.get(c.make_id), model: models.get(c.model_id) }))
        .filter((x: any) => (x.make || x.model) && !seen.has(`${x.make}|${x.model}`) && seen.add(`${x.make}|${x.model}`));
    }
    // Fallback: model-level compat is guidance only.
    return (data?.compat ?? []).map((c: any) => ({ model: models.get(c.vehicle_model_id) })).filter((x: any) => x.model);
  }, [data, veh, current?.id]);
  const compatIsVariantLevel = useMemo(
    () => (data?.variantCompat ?? []).some((c: any) => c.variant_id === current?.id),
    [data, current?.id],
  );


  const mainImg = (model?.images?.main?.url) || (model?.images?.gallery?.url);
  const gallery = model ? Object.values(model.images ?? {}).filter((x: any) => x?.url) : [];

  if (isLoading) return <div className="container-x py-20 text-center text-sm text-muted-foreground">Loading…</div>;
  if (error) throw error;
  if (!model) throw notFound();

  const priceVisible = current && current.price != null && current.price_mode !== "hidden" && current.price_mode !== "on_request";
  const waCtx = { brand: brand?.name, model: model.name, size: current?.normalized_size, url: typeof window !== "undefined" ? window.location.href : undefined };

  return (
    <section className="py-8">
      <div className="container-x">
        <Link to="/tyres" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink"><ChevronLeft className="h-4 w-4" /> All tyres</Link>
        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          <div>
            <div className="card-surface bg-white aspect-square grid place-items-center overflow-hidden">
              {mainImg ? <img src={mainImg} alt={`${brand?.name} ${model.name}`} className="max-h-full max-w-full object-contain p-8" /> : <div className="text-muted-foreground text-sm">No image</div>}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {gallery.map((g: any, i) => <img key={i} src={g.url} alt="" className="h-16 w-16 rounded border border-border object-contain bg-white p-1" />)}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              {brand?.logo_signed_url && <img src={brand.logo_signed_url} alt={brand.name} className="h-10 w-10 rounded object-contain bg-white border border-border" />}
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{brand?.name}</div>
                <h1 className="font-display text-3xl text-ink">{model.name}</h1>
                {model.pattern_name && <div className="text-sm text-muted-foreground">{model.pattern_name}</div>}
              </div>
            </div>
            {model.short_desc && <p className="mt-3 text-muted-foreground">{model.short_desc}</p>}

            {variants.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available sizes</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {variants.map(v => (
                    <button key={v.id} onClick={() => setVariantId(v.id)}
                      className={`rounded-full border px-3 py-1 text-sm ${variantId === v.id ? "border-ink bg-ink text-white" : "border-border hover:border-primary"}`}>{v.normalized_size}</button>
                  ))}
                </div>
              </div>
            )}

            {current && (
              <div className="mt-6 card-surface bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Selected size</div>
                    <div className="font-display text-xl">{current.normalized_size}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${current.availability === "in_stock" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {current.availability?.replace(/_/g," ")}
                  </span>
                </div>
                {priceVisible && (
                  <div className="mt-3 text-2xl font-bold text-primary">PKR {(current.price as number).toLocaleString()}</div>
                )}
                {!priceVisible && <div className="mt-3 text-sm text-muted-foreground">Confirm today's price via WhatsApp.</div>}
                {current.availability_note && <div className="mt-1 text-xs text-muted-foreground">{current.availability_note}</div>}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <a href={waTyreLink(waCtx)} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { slug, size: current.normalized_size, source: "tyre_detail" })} className="btn-primary text-sm"><MessageCircle className="h-4 w-4" /> WhatsApp Now</a>
                  <BookingButton label="Book Appointment" context={{ source: "tyre_detail", brand: brand?.name, model: model.name, size: current.normalized_size }} />
                  <a href={telLink()} onClick={() => track("call_click", { slug })} className="btn-outline text-sm sm:col-span-2"><Phone className="h-4 w-4" /> Call {business.phoneDisplay}</a>
                </div>

              </div>
            )}

            {current && (
              <div className="mt-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Specifications</div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {current.load_index && <><dt className="text-muted-foreground">Load index</dt><dd>{current.load_index}</dd></>}
                  {current.speed_rating && <><dt className="text-muted-foreground">Speed rating</dt><dd>{current.speed_rating}</dd></>}
                  <dt className="text-muted-foreground">Tubeless</dt><dd>{current.tubeless ? "Yes" : "No"}</dd>
                  {current.run_flat && <><dt className="text-muted-foreground">Run-flat</dt><dd>Yes</dd></>}
                  {current.xl_reinforced && <><dt className="text-muted-foreground">XL / Reinforced</dt><dd>Yes</dd></>}
                  {model.origin_country && <><dt className="text-muted-foreground">Origin</dt><dd>{model.origin_country}</dd></>}
                  {model.warranty_text && <><dt className="text-muted-foreground">Warranty</dt><dd>{model.warranty_text}</dd></>}
                </dl>
              </div>
            )}

            {compatVehicles.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {compatIsVariantLevel ? `This size (${current?.normalized_size}) fits` : "Vehicles this model is commonly fitted on"}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {compatVehicles.map((v: any, i: number) => <span key={i} className="rounded-full border border-border bg-surface px-2.5 py-1">{[v.make, v.model].filter(Boolean).join(" ")}</span>)}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground italic">Compatibility is guidance only — please confirm the correct size before fitting.</p>
              </div>
            )}

          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <LeadForm title="Prefer we call you back?" tyre_size={current?.normalized_size} model_id={model.id} variant_id={current?.id} search_context={{ slug }} />
        </div>
      </div>
    </section>
  );
}
