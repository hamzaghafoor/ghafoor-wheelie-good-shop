import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Phone, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { listBrandsPublic } from "@/lib/brands.functions";
import { business, waLink } from "@/lib/business";

type Props = {
  category: string;             // slug like "lubricants"
  eyebrow: string;
  title: string;
  intro: string;
  waMessage: string;
  chips?: string[];
};

export function CategoryLanding({ category, eyebrow, title, intro, waMessage, chips = [] }: Props) {
  const fetchBrands = useServerFn(listBrandsPublic);
  const { data: brands } = useQuery({ queryKey: ["public-brands"], queryFn: () => fetchBrands() });
  const relevant = (brands ?? []).filter((b: any) => Array.isArray(b.categories) && b.categories.includes(category)).slice(0, 12);

  return (
    <>
      <section className="bg-ink py-14 text-white md:py-20">
        <div className="container-x">
          <p className="eyebrow text-primary">{eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-white/70">{intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={waLink(waMessage)} target="_blank" rel="noreferrer" className="btn-primary text-sm">
              <MessageCircle className="h-4 w-4" /> WhatsApp for Options & Price
            </a>
            <a href={`tel:${business.phone}`} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:border-primary hover:text-primary">
              <Phone className="h-4 w-4" /> Call the Shop
            </a>
          </div>
          {chips.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {chips.map((c) => (
                <a key={c} href={waLink(`${waMessage} — ${c}`)} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 hover:border-primary hover:text-primary">{c}</a>
              ))}
            </div>
          )}
        </div>
      </section>

      {relevant.length > 0 && (
        <section className="py-14">
          <div className="container-x">
            <div className="mb-6 max-w-2xl"><p className="eyebrow">Brands we stock</p><h2 className="mt-2 font-display text-3xl">Reputable brands, straight advice</h2></div>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
              {relevant.map((b: any) => (
                <div key={b.id} className="card-surface flex aspect-square items-center justify-center p-3">
                  {b.logo_signed_url || b.logo_url
                    ? <img src={b.logo_signed_url ?? b.logo_url} alt={b.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                    : <span className="text-center text-xs font-semibold text-ink">{b.name}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-surface-2 py-14">
        <div className="container-x grid gap-6 md:grid-cols-3">
          <Feature icon={ShieldCheck} title="Genuine products" body="We source from reputable brands and verify supplier quality." />
          <Feature icon={Sparkles} title="Expert recommendations" body="Tell us your vehicle and usage — we suggest suitable options." />
          <Feature icon={MessageCircle} title="WhatsApp-first" body="Check today's price, ask a question, or reserve — instantly on WhatsApp." />
        </div>
      </section>

      <section className="py-14">
        <div className="container-x card-surface p-8 text-center">
          <h3 className="font-display text-2xl text-ink">Not sure what you need?</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Share your vehicle, model year, and what you're trying to solve. Our team will recommend suitable options and today's price.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a href={waLink(`Assalam-o-Alaikum, I need a recommendation for ${eyebrow.toLowerCase()}.`)} target="_blank" rel="noreferrer" className="btn-primary text-sm">Get Expert Recommendation <ArrowRight className="h-4 w-4" /></a>
            <Link to="/contact" className="btn-outline text-sm">Contact us</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="card-surface bg-white p-5">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
      <h3 className="mt-3 font-display text-lg text-ink">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
