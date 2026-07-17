import { createFileRoute } from "@tanstack/react-router";
import { CTASection } from "@/components/CTASection";

export const Route = createFileRoute("/tyre-guide")({
  head: () => ({
    meta: [
      { title: "Tyre Guide — Sizes, Wear & Care | Ghafoor Motors Karachi" },
      { name: "description", content: "Understand tyre sizes, when to replace tyres, wheel alignment vs balancing, and basic tyre care — a simple guide from Ghafoor Motors, Karachi." },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  return (
    <>
      <section className="bg-ink py-14 text-white md:py-20">
        <div className="container-x max-w-3xl">
          <p className="eyebrow text-primary">Tyre Guide</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Simple Tyre Advice for Karachi Drivers</h1>
          <p className="mt-3 text-white/70">Learn how to read your tyre size, when to replace tyres, and the difference between alignment and balancing.</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-x grid gap-10 lg:grid-cols-2">
          <div className="card-surface p-6 md:p-8">
            <h2 className="font-display text-2xl text-ink">How to read 195/65 R15</h2>
            <TyreSidewall />
            <dl className="mt-5 space-y-2 text-sm">
              <Row k="195" v="Tyre width in millimetres" />
              <Row k="65" v="Sidewall height as a percentage of width" />
              <Row k="R" v="Radial construction" />
              <Row k="15" v="Wheel diameter in inches" />
            </dl>
          </div>

          <div className="space-y-6">
            <Article title="Signs of tyre wear">
              Uneven tread wear, cracks on the sidewall, bulges, and tread depth below the wear indicators are all signs a tyre may need attention. If tyres are more than 5–6 years old, have them inspected even if they look fine.
            </Article>
            <Article title="Tyre pressure basics">
              Correct pressure improves fuel economy, handling and tyre life. Check pressure when tyres are cold and follow the values printed on the sticker inside your driver's door frame.
            </Article>
            <Article title="Wheel alignment vs wheel balancing">
              Alignment corrects wheel angles so the car tracks straight. Balancing corrects weight distribution so wheels spin without vibration. They fix different problems and are usually done together after new tyre fitment.
            </Article>
            <Article title="Tyre rotation">
              Rotating tyres between positions every 8,000–10,000 km helps them wear more evenly, extending their useful life.
            </Article>
          </div>
        </div>

        <div className="container-x mt-10 max-w-3xl">
          <h2 className="font-display text-3xl text-ink">FAQ</h2>
          <div className="mt-5 space-y-3">
            <Faq q="How do I know when it's time to replace my tyres?">
              Check for shallow tread depth (below wear indicators), sidewall damage, repeated pressure loss, or age above 5–6 years. A quick inspection at our showroom is free.
            </Faq>
            <Faq q="Can I mix tyre brands or sizes?">
              We recommend matching tyres on the same axle. Mixing sizes affects handling and can be unsafe on modern vehicles.
            </Faq>
            <Faq q="Is nitrogen filling necessary?">
              It's optional. Nitrogen helps tyres hold pressure more consistently, especially over long trips. Regular air is also fine when kept at the correct pressure.
            </Faq>
          </div>
          <p className="mt-6 rounded-lg border border-border bg-surface-2 p-4 text-xs text-muted-foreground">
            Recommendations can vary by vehicle variant and manufacturer specification. Confirm the approved tyre size for your specific vehicle before purchasing.
          </p>
        </div>
      </section>

      <CTASection />
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2">
      <dt className="font-mono text-base font-bold text-primary">{k}</dt>
      <dd className="text-sm text-foreground/80">{v}</dd>
    </div>
  );
}
function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-surface p-6">
      <h3 className="font-display text-xl text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/80">{children}</p>
    </div>
  );
}
function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="card-surface group p-5">
      <summary className="cursor-pointer list-none font-display text-lg text-ink">
        <span className="mr-2 text-primary">＋</span>{q}
      </summary>
      <p className="mt-3 text-sm text-foreground/80">{children}</p>
    </details>
  );
}

function TyreSidewall() {
  return (
    <svg viewBox="0 0 400 200" className="mt-5 h-auto w-full" role="img" aria-label="Tyre sidewall diagram">
      <defs>
        <linearGradient id="tyreG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1a1a1a" />
          <stop offset="1" stopColor="#0a0a0a" />
        </linearGradient>
      </defs>
      <rect x="20" y="30" width="360" height="140" rx="70" fill="url(#tyreG)" />
      <rect x="60" y="70" width="280" height="60" rx="30" fill="#f7f7f5" />
      <text x="200" y="108" textAnchor="middle" fontFamily="Manrope" fontWeight="800" fontSize="30" fill="#101010">
        195/65 R15
      </text>
      <text x="80" y="55" fontFamily="Manrope" fontSize="12" fill="#F47A20">Width</text>
      <text x="180" y="55" fontFamily="Manrope" fontSize="12" fill="#F47A20">Profile</text>
      <text x="260" y="55" fontFamily="Manrope" fontSize="12" fill="#F47A20">Radial</text>
      <text x="315" y="55" fontFamily="Manrope" fontSize="12" fill="#F47A20">Rim</text>
    </svg>
  );
}
