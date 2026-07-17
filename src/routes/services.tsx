import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { services } from "@/lib/services";
import { ServiceCard } from "@/components/ServiceCard";
import { CTASection } from "@/components/CTASection";
import { waLink } from "@/lib/business";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Wheel Alignment, Balancing & Tyre Care Karachi | Ghafoor Motors" },
      { name: "description", content: "Book wheel alignment, wheel balancing, nitrogen air filling, tyre fitting and pressure checks at Ghafoor Motors, PECHS, Karachi." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <>
      <section className="bg-ink py-14 text-white md:py-20">
        <div className="container-x">
          <p className="eyebrow text-primary">Services</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Professional Care Beyond Tyres</h1>
          <p className="mt-3 max-w-2xl text-white/70">Alignment, balancing, nitrogen filling and tyre-care services — done professionally at our PECHS showroom.</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-x grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => <ServiceCard key={s.id} service={s} />)}
        </div>
      </section>

      <section className="bg-surface-2 py-14">
        <div className="container-x max-w-3xl">
          <h2 className="font-display text-3xl text-ink">Book an appointment</h2>
          <p className="mt-1 text-muted-foreground">We'll confirm your slot on WhatsApp.</p>
          <BookingForm />
        </div>
      </section>

      <CTASection />
    </>
  );
}

function BookingForm() {
  const [form, setForm] = useState({ name: "", phone: "", make: "", model: "", reg: "", service: services[0].name, date: "", time: "", notes: "" });
  const [done, setDone] = useState(false);
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `Assalam-o-Alaikum, I would like to book a service.\nName: ${form.name}\nPhone: ${form.phone}\nVehicle: ${form.make} ${form.model} (${form.reg || "reg n/a"})\nService: ${form.service}\nPreferred: ${form.date} ${form.time}\nNotes: ${form.notes}`;
    window.open(waLink(msg), "_blank");
    setDone(true);
  };

  if (done) {
    return (
      <div className="card-surface mt-5 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h3 className="mt-3 font-display text-2xl text-ink">Booking request sent</h3>
        <p className="mt-2 text-muted-foreground">Your appointment is pending confirmation. Our team will contact you on WhatsApp shortly.</p>
        <button className="btn-outline mt-4 text-sm" onClick={() => setDone(false)}>Book another</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card-surface mt-5 grid gap-3 p-6 md:grid-cols-2">
      <Field label="Full name"><input required value={form.name} onChange={upd("name")} className="input" /></Field>
      <Field label="Mobile / WhatsApp"><input required pattern="^(\+92|0)?3\d{9}$" value={form.phone} onChange={upd("phone")} className="input" placeholder="03XX-XXXXXXX" /></Field>
      <Field label="Vehicle make"><input required value={form.make} onChange={upd("make")} className="input" /></Field>
      <Field label="Vehicle model"><input required value={form.model} onChange={upd("model")} className="input" /></Field>
      <Field label="Registration (optional)"><input value={form.reg} onChange={upd("reg")} className="input" /></Field>
      <Field label="Service required">
        <select value={form.service} onChange={upd("service")} className="input">
          {services.map((s) => <option key={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="Preferred date"><input type="date" value={form.date} onChange={upd("date")} className="input" /></Field>
      <Field label="Preferred time"><input type="time" value={form.time} onChange={upd("time")} className="input" /></Field>
      <Field label="Additional notes" full>
        <textarea rows={3} value={form.notes} onChange={upd("notes")} className="input min-h-[80px]" />
      </Field>
      <div className="md:col-span-2">
        <button className="btn-primary w-full">Request Appointment</button>
        <p className="mt-2 text-center text-xs text-muted-foreground">Slots are confirmed by our team via WhatsApp.</p>
      </div>
      <style>{`.input{height:44px;width:100%;border-radius:10px;border:1px solid var(--border);background:var(--surface);padding:0 12px;font-size:14px;} .input:focus{outline:none;border-color:var(--primary);}`}</style>
    </form>
  );
}
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-sm ${full ? "md:col-span-2" : ""}`}>
      <span className="mb-1 block font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}
