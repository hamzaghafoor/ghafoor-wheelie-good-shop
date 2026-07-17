import { createFileRoute } from "@tanstack/react-router";
import { CTASection } from "@/components/CTASection";
import { LocationSection } from "@/components/LocationSection";
import hero from "@/assets/hero-showroom.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Ghafoor Motors | Tyres & Lubricants, PECHS Karachi" },
      { name: "description", content: "Ghafoor Motors is a Karachi tyre, lubricant and wheel-care business serving local vehicle owners from Khalid Bin Waleed Road, PECHS." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <section className="bg-ink py-14 text-white md:py-20">
        <div className="container-x max-w-3xl">
          <p className="eyebrow text-primary">About</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Helping Karachi Drivers Make Better Tyre Choices</h1>
          <p className="mt-4 text-white/70">
            Ghafoor Motors is a local tyre, lubricant and wheel-care business serving vehicle owners from our Khalid Bin Waleed Road showroom in PECHS, Karachi.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container-x grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="overflow-hidden rounded-2xl border border-border">
            <img src={hero} alt="Showroom" loading="lazy" width={1600} height={1200} className="h-full w-full object-cover" />
          </div>
          <div>
            <h2 className="font-display text-3xl text-ink">Straight advice. Suitable products. Professional service.</h2>
            <p className="mt-4 text-foreground/80">
              We focus on giving customers honest guidance, sharing multiple suitable options where possible, and taking care of the fitting and wheel-care work that keeps your car safe and comfortable.
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-foreground/80">
              {["Honest guidance", "Suitable product recommendations", "Product quality focus", "Professional service", "Long-term customer relationships", "Road safety and driving comfort"].map((s) => (
                <li key={s} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary" />{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <LocationSection />
      <CTASection />
    </>
  );
}
