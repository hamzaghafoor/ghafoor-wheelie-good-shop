import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LocationSection } from "@/components/LocationSection";
import { waLink, business, telLink } from "@/lib/business";
import { Instagram, Facebook, MessageCircle, Phone, CheckCircle2, Star } from "lucide-react";
import { GOOGLE_REVIEW_URL } from "@/lib/review-request";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Ghafoor Motors | Tyres & Lubricants Karachi" },
      { name: "description", content: "Call, WhatsApp or visit Ghafoor Motors in PECHS, Karachi for tyres, lubricants, wheel alignment, wheel balancing and more." },
    ],
  }),
  component: ContactPage,
});

const inquiryTypes = ["Tyre Price", "Tyre Availability", "Lubricants", "Wheel Alignment", "Wheel Balancing", "Other"];

function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", type: inquiryTypes[0], vehicle: "", message: "" });
  const [done, setDone] = useState(false);
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `Assalam-o-Alaikum, inquiry from website.\nName: ${form.name}\nPhone: ${form.phone}\nInquiry: ${form.type}\nVehicle: ${form.vehicle}\nMessage: ${form.message}`;
    window.open(waLink(msg), "_blank");
    setDone(true);
  };

  return (
    <>
      <section className="bg-ink py-14 text-white md:py-20">
        <div className="container-x max-w-3xl">
          <p className="eyebrow text-primary">Contact</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Get in touch with Ghafoor Motors</h1>
          <p className="mt-3 text-white/70">Call, WhatsApp or visit our showroom in PECHS, Karachi.</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-x grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="card-surface h-fit p-6 md:p-8">
            <h2 className="font-display text-2xl text-ink">Reach us directly</h2>
            <div className="mt-5 space-y-3">
              <a href={telLink()} className="btn-dark w-full text-sm"><Phone className="h-4 w-4" /> Call {business.phoneDisplay}</a>
              <a href={waLink("Assalam-o-Alaikum, I have an inquiry.")} target="_blank" rel="noreferrer" className="btn-primary w-full text-sm"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
              <a href={business.mapsUrl} target="_blank" rel="noreferrer" className="btn-outline w-full text-sm">Get Directions</a>
            </div>
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Follow</p>
              <div className="mt-2 flex gap-2">
                <a href={business.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-primary hover:text-primary"><Instagram className="h-4 w-4" /></a>
                <a href={business.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-primary hover:text-primary"><Facebook className="h-4 w-4" /></a>
              </div>
            </div>
            <div className="mt-6 border-t border-border pt-4 text-sm text-foreground/80">
              <p className="font-semibold text-ink">Business hours</p>
              {business.hours.map((h) => (
                <p key={h.day} className="mt-1 text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{h.day}:</span> {h.time}</p>
              ))}
            </div>
          </div>

          {done ? (
            <div className="card-surface p-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <h3 className="mt-3 font-display text-2xl text-ink">Thanks — message sent</h3>
              <p className="mt-2 text-muted-foreground">We'll get back to you on WhatsApp shortly.</p>
              <div className="mt-6 border-t border-border pt-5">
                <p className="text-sm text-foreground/80">Enjoyed working with us before? A quick Google review really helps our team.</p>
                <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer" className="btn-primary mt-3 inline-flex text-sm">
                  <Star className="h-4 w-4" /> Write a Google Review
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="card-surface grid gap-3 p-6 md:grid-cols-2 md:p-8">
              <F label="Full name"><input required value={form.name} onChange={upd("name")} className="in" /></F>
              <F label="Mobile / WhatsApp"><input required pattern="^(\+92|0)?3\d{9}$" placeholder="03XX-XXXXXXX" value={form.phone} onChange={upd("phone")} className="in" /></F>
              <F label="Inquiry type">
                <select value={form.type} onChange={upd("type")} className="in">{inquiryTypes.map((t) => <option key={t}>{t}</option>)}</select>
              </F>
              <F label="Vehicle (make / model / year)"><input value={form.vehicle} onChange={upd("vehicle")} className="in" /></F>
              <F label="Message" full><textarea rows={4} value={form.message} onChange={upd("message")} className="in min-h-[100px] py-2" /></F>
              <div className="md:col-span-2">
                <button className="btn-primary w-full">Send Inquiry</button>
                <p className="mt-2 text-center text-xs text-muted-foreground">By submitting, you agree that we may contact you regarding your inquiry.</p>
              </div>
              <style>{`.in{height:44px;width:100%;border-radius:10px;border:1px solid var(--border);background:var(--surface);padding:0 12px;font-size:14px;} .in:focus{outline:none;border-color:var(--primary);}`}</style>
            </form>
          )}
        </div>
      </section>

      <LocationSection />
    </>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-sm ${full ? "md:col-span-2" : ""}`}>
      <span className="mb-1 block font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}
