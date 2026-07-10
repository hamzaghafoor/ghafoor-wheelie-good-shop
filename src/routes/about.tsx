import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Ghafoor Motors — Tyres & Lubricants Since 1998" },
      { name: "description", content: "Family-run specialist in premium tyres and engine oils, serving Lahore and all of Pakistan since 1998." },
      { property: "og:title", content: "About Ghafoor Motors" },
      { property: "og:description", content: "27+ years of trusted service in tyres and lubricants." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <section className="container-x py-20">
        <div className="text-xs font-bold uppercase tracking-widest text-primary">About us</div>
        <h1 className="mt-2 max-w-3xl font-display text-5xl tracking-wide sm:text-6xl">
          A workshop story that started with a single stack of tyres.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Ghafoor Motors was founded in 1998 by Muhammad Ghafoor as a small tyre shop on GT Road. Nearly three decades later,
          we're one of the region's most trusted names for tyres, engine oils and everything in between — still family-run,
          still obsessed with the details.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { t: "Authorised distributors", d: "We buy directly from brand-authorised distributors. No parallel imports, no fakes." },
            { t: "Trained fitters", d: "Every technician is trained on modern balancing, alignment and torque specs." },
            { t: "Honest pricing", d: "Transparent price lists. What you see online is what you pay in-store." },
          ].map((v) => (
            <div key={v.t} className="rounded-xl border border-border/60 bg-surface p-6">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-display text-2xl tracking-wide">{v.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
