import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Ghafoor Motors — Tyres & Lubricants" },
      { name: "description", content: "Call, email or visit Ghafoor Motors on GT Road, Lahore. Open 6 days a week." },
      { property: "og:title", content: "Contact Ghafoor Motors" },
      { property: "og:description", content: "Get in touch with our team for tyre and oil recommendations." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <section className="container-x py-20">
      <div className="text-xs font-bold uppercase tracking-widest text-primary">Contact</div>
      <h1 className="mt-2 font-display text-5xl tracking-wide sm:text-6xl">Talk to a specialist</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Tell us your car make, model and current mileage — we'll get back within an hour on WhatsApp.
      </p>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <form
          onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          className="space-y-4 rounded-2xl border border-border/60 bg-surface p-6 md:p-8"
        >
          {[
            { name: "name", label: "Name", type: "text" },
            { name: "phone", label: "Phone / WhatsApp", type: "tel" },
            { name: "car", label: "Car make, model & year", type: "text" },
          ].map((f) => (
            <div key={f.name}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{f.label}</label>
              <input
                required
                type={f.type}
                name={f.name}
                className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">What do you need?</label>
            <textarea
              required
              rows={4}
              name="message"
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={sent}
            className="w-full rounded-md bg-primary py-3 font-display text-lg tracking-wide text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {sent ? "Sent — we'll be in touch" : "Send enquiry"}
          </button>
        </form>

        <div className="space-y-4">
          {[
            { icon: MapPin, t: "Visit", d: "Main GT Road, near Shahdara Bridge, Lahore" },
            { icon: Phone, t: "Call", d: "+92 300 1234567 · +92 42 3722 0000" },
            { icon: Mail, t: "Email", d: "sales@ghafoormotors.pk" },
            { icon: Clock, t: "Hours", d: "Mon–Sat · 9:00 AM – 9:00 PM" },
          ].map((c) => (
            <div key={c.t} className="flex items-start gap-4 rounded-xl border border-border/60 bg-surface p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                <c.icon className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{c.t}</div>
                <div className="mt-1">{c.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
