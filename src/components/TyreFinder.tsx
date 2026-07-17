import { useMemo, useState } from "react";
import { Search, Car, Ruler } from "lucide-react";
import { vehicleMakes, tyreWidths, tyreProfiles, tyreRims } from "@/lib/vehicles";
import { waLink } from "@/lib/business";

type Tab = "vehicle" | "size";

export function TyreFinder({ compact = false }: { compact?: boolean }) {
  const [tab, setTab] = useState<Tab>("vehicle");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [w, setW] = useState("");
  const [p, setP] = useState("");
  const [r, setR] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const models = useMemo(() => vehicleMakes.find((v) => v.name === make)?.models ?? [], [make]);

  const submit = () => {
    const msg =
      tab === "vehicle"
        ? `Assalam-o-Alaikum, I am looking for tyres for my ${year || ""} ${make || ""} ${model || ""}. Please recommend suitable options and share today's price.`
        : `Assalam-o-Alaikum, please share available tyre options and today's price for size ${w}/${p} R${r}.`;
    window.open(waLink(msg), "_blank");
  };

  return (
    <div className={`card-surface ${compact ? "p-4 md:p-6" : "p-6 md:p-8"}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl">Find the Right Tyres for Your Car</h2>
          <p className="mt-1 text-sm text-muted-foreground">Search by vehicle or tyre size — we'll recommend suitable options.</p>
        </div>
        <div className="inline-flex rounded-lg bg-surface-2 p-1 text-sm font-medium">
          <button onClick={() => setTab("vehicle")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${tab === "vehicle" ? "bg-ink text-white" : "text-foreground/70"}`}>
            <Car className="h-4 w-4" /> By Vehicle
          </button>
          <button onClick={() => setTab("size")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${tab === "size" ? "bg-ink text-white" : "text-foreground/70"}`}>
            <Ruler className="h-4 w-4" /> By Size
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {tab === "vehicle" ? (
          <>
            <Select label="Make" value={make} onChange={(v) => { setMake(v); setModel(""); }} options={vehicleMakes.map((m) => m.name)} placeholder="Select make" />
            <Select label="Model" value={model} onChange={setModel} options={models} placeholder="Select model" />
            <Select label="Year" value={year} onChange={setYear} options={Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - i))} placeholder="Year" />
            <button onClick={submit} className="btn-primary mt-auto h-11">
              <Search className="h-4 w-4" /> Show Suitable Options
            </button>
          </>
        ) : (
          <>
            <Select label="Width" value={w} onChange={setW} options={tyreWidths} placeholder="e.g. 195" />
            <Select label="Profile" value={p} onChange={setP} options={tyreProfiles} placeholder="e.g. 65" />
            <Select label="Rim (R)" value={r} onChange={setR} options={tyreRims} placeholder="e.g. 15" />
            <button onClick={submit} className="btn-primary mt-auto h-11">
              <Search className="h-4 w-4" /> Show Suitable Options
            </button>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button onClick={() => setShowGuide((v) => !v)} className="text-primary underline-offset-4 hover:underline">
          I don't know my tyre size
        </button>
        <span className="text-muted-foreground">Example format: 195 / 65 R15</span>
      </div>

      {showGuide && (
        <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4 text-sm text-foreground/80">
          <p className="font-semibold text-ink">Where to find your tyre size</p>
          <p className="mt-1">Look on the sidewall of any of your current tyres. You'll see a code like <span className="font-mono font-semibold">195/65 R15 91H</span>. The first three numbers (width, profile, rim) are what we need. You can also find it on the sticker inside the driver's door frame or in your owner's manual.</p>
        </div>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (<option key={o} value={o}>{o}</option>))}
      </select>
    </label>
  );
}
