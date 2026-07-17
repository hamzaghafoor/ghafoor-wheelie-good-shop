import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { lubricants, lubeCategories, type LubeCategory } from "@/lib/lubricants";
import { LubricantCard } from "@/components/LubricantCard";
import { CTASection } from "@/components/CTASection";
import { waLink } from "@/lib/business";

export const Route = createFileRoute("/lubricants")({
  head: () => ({
    meta: [
      { title: "Engine Oil & Lubricants Karachi | Ghafoor Motors" },
      { name: "description", content: "Quality engine oils, transmission fluids, coolants and brake fluids for cars and SUVs in Karachi. Check price and availability via WhatsApp." },
    ],
  }),
  component: LubesPage,
});

function LubesPage() {
  const [cat, setCat] = useState<LubeCategory | "All">("All");
  const filtered = cat === "All" ? lubricants : lubricants.filter((l) => l.category === cat);

  return (
    <>
      <section className="bg-ink py-14 text-white md:py-20">
        <div className="container-x">
          <p className="eyebrow text-primary">Lubricants</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Quality Lubricants for Better Engine Care</h1>
          <p className="mt-3 max-w-2xl text-white/70">Explore engine oils and automotive lubricants suitable for different vehicles and driving requirements.</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-x">
          <div className="flex flex-wrap gap-2">
            {(["All", ...lubeCategories] as const).map((c) => (
              <button key={c} onClick={() => setCat(c as any)} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${cat === c ? "border-ink bg-ink text-white" : "border-border bg-surface text-foreground/70 hover:border-primary hover:text-primary"}`}>{c}</button>
            ))}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l) => <LubricantCard key={l.id} item={l} />)}
          </div>

          <p className="mt-6 rounded-lg border border-border bg-surface-2 p-4 text-xs text-muted-foreground">
            Always confirm the required viscosity and specification from your vehicle owner's manual or with a qualified professional.
          </p>
        </div>
      </section>

      <section className="bg-surface-2 py-14">
        <div className="container-x max-w-3xl">
          <h2 className="font-display text-3xl text-ink">Not sure which lubricant to use?</h2>
          <p className="mt-2 text-muted-foreground">Share your vehicle details and our team will recommend suitable options.</p>
          <LubeForm />
        </div>
      </section>

      <CTASection />
    </>
  );
}

function LubeForm() {
  const [form, setForm] = useState({ make: "", model: "", year: "", engine: "", mileage: "", product: "", name: "", phone: "" });
  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `Assalam-o-Alaikum, please recommend a suitable lubricant.\nName: ${form.name}\nPhone: ${form.phone}\nVehicle: ${form.make} ${form.model} ${form.year}\nEngine: ${form.engine}\nMileage: ${form.mileage}\nProduct: ${form.product}`;
    window.open(waLink(msg), "_blank");
  };
  return (
    <form onSubmit={submit} className="card-surface mt-5 grid gap-3 p-6 md:grid-cols-2">
      <Input label="Vehicle Make" value={form.make} onChange={update("make")} required />
      <Input label="Vehicle Model" value={form.model} onChange={update("model")} required />
      <Input label="Year" value={form.year} onChange={update("year")} />
      <Input label="Engine variant (optional)" value={form.engine} onChange={update("engine")} />
      <Input label="Current mileage (optional)" value={form.mileage} onChange={update("mileage")} />
      <Input label="Required product (optional)" value={form.product} onChange={update("product")} />
      <Input label="Your name" value={form.name} onChange={update("name")} required />
      <Input label="Phone / WhatsApp" value={form.phone} onChange={update("phone")} required pattern="^(\+92|0)?3\d{9}$" hint="Pakistani mobile: 03XX-XXXXXXX" />
      <div className="md:col-span-2">
        <button className="btn-primary w-full">Send Inquiry via WhatsApp</button>
        <p className="mt-2 text-center text-xs text-muted-foreground">By submitting, you agree that we may follow up regarding your inquiry.</p>
      </div>
    </form>
  );
}

function Input({ label, hint, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-ink">{label}</span>
      <input {...p} className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none" />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
