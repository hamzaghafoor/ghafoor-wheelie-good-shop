import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Car, Ruler } from "lucide-react";
import {
  finderWidths, finderProfiles, finderRims,
  finderMakes, finderModels, finderYears, finderConfigurations,
} from "@/lib/finder.functions";
import { track } from "@/lib/analytics";

type Mode = "size" | "vehicle";
type Props = {
  variant?: "hero" | "page";
  initial?: {
    mode?: Mode;
    w?: number | null; p?: number | null; r?: number | null;
    make?: string | null; model?: string | null; year?: number | null; config?: string | null;
  };
  /** When rendered inside /tyres, page owns the URL; when hero, we navigate to /tyres. */
  onSubmit?: (params: URLSearchParams) => void;
};

const SESSION_KEY = "gmtl_finder_v1";

export function TyreFinderShared({ variant = "page", initial, onSubmit }: Props) {
  const navigate = useNavigate();
  const isHero = variant === "hero";

  // Restore last session if no initial state given.
  const restored = useMemo(() => {
    if (initial && (initial.mode || initial.w || initial.make)) return initial;
    if (typeof window === "undefined") return {} as NonNullable<Props["initial"]>;
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }, [initial]);

  const [mode, setMode] = useState<Mode>(restored.mode ?? "size");
  const [w, setW] = useState<number | null>(restored.w ?? null);
  const [p, setP] = useState<number | null>(restored.p ?? null);
  const [r, setR] = useState<number | null>(restored.r ?? null);
  const [makeId, setMakeId] = useState<string | null>(restored.make ?? null);
  const [modelId, setModelId] = useState<string | null>(restored.model ?? null);
  const [year, setYear] = useState<number | null>(restored.year ?? null);
  const [configId, setConfigId] = useState<string | null>(restored.config ?? null);

  // Persist selections.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = { mode, w, p, r, make: makeId, model: modelId, year, config: configId };
    try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
  }, [mode, w, p, r, makeId, modelId, year, configId]);

  // ==== SIZE ====
  const widthsFn = useServerFn(finderWidths);
  const profilesFn = useServerFn(finderProfiles);
  const rimsFn = useServerFn(finderRims);
  const widths = useQuery({ queryKey: ["finder", "widths"], queryFn: () => widthsFn() });
  const profiles = useQuery({
    queryKey: ["finder", "profiles", w],
    queryFn: () => profilesFn({ data: { width: w! } }),
    enabled: !!w,
  });
  const rims = useQuery({
    queryKey: ["finder", "rims", w, p],
    queryFn: () => rimsFn({ data: { width: w!, profile: p! } }),
    enabled: !!w && !!p,
  });

  // ==== VEHICLE ====
  const makesFn = useServerFn(finderMakes);
  const modelsFn = useServerFn(finderModels);
  const yearsFn = useServerFn(finderYears);
  const configsFn = useServerFn(finderConfigurations);
  const makes = useQuery({ queryKey: ["finder", "makes"], queryFn: () => makesFn() });
  const models = useQuery({
    queryKey: ["finder", "models", makeId],
    queryFn: () => modelsFn({ data: { make_id: makeId! } }),
    enabled: !!makeId,
  });
  const years = useQuery({
    queryKey: ["finder", "years", modelId],
    queryFn: () => yearsFn({ data: { model_id: modelId! } }),
    enabled: !!modelId,
  });
  const configs = useQuery({
    queryKey: ["finder", "configs", modelId, year],
    queryFn: () => configsFn({ data: { model_id: modelId!, year: year ?? null } }),
    enabled: !!modelId,
  });

  const yearOptions = useMemo(() => {
    const list = (years.data ?? []) as Array<{ id: string; year_from: number; year_to: number | null }>;
    if (!list.length) return [] as number[];
    const set = new Set<number>();
    const nowYear = new Date().getFullYear();
    for (const y of list) {
      const from = y.year_from;
      const to = y.year_to ?? nowYear;
      for (let n = to; n >= from; n--) set.add(n);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [years.data]);

  const emptyInventory = mode === "size" && !widths.isLoading && (widths.data ?? []).length === 0;

  function buildParams(): URLSearchParams {
    const q = new URLSearchParams();
    q.set("mode", mode);
    if (mode === "size") {
      if (w) q.set("w", String(w));
      if (p) q.set("p", String(p));
      if (r) q.set("r", String(r));
    } else {
      if (makeId) q.set("make", makeId);
      if (modelId) q.set("model", modelId);
      if (year) q.set("year", String(year));
      if (configId) q.set("config", configId);
    }
    return q;
  }

  function onSubmitClick() {
    if (mode === "size") {
      track("tyre_size_search", { source: variant, w, p, r });
    } else {
      track("vehicle_search", { source: variant, make: makeId, model: modelId, year, config: configId });
    }
    const q = buildParams();
    if (onSubmit) onSubmit(q);
    else navigate({ to: "/tyres", search: Object.fromEntries(q) as any });
  }

  const submitDisabled =
    mode === "size" ? !w :
    !modelId;

  return (
    <div className={`card-surface ${isHero ? "p-4 md:p-6" : "p-5"}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        {isHero && (
          <div>
            <h2 className="font-display text-2xl md:text-3xl">Find the Right Tyres for Your Car</h2>
            <p className="mt-1 text-sm text-muted-foreground">Search by tyre size or vehicle — we'll show what fits.</p>
          </div>
        )}
        <div role="tablist" aria-label="Finder mode" className="inline-flex rounded-lg bg-surface-2 p-1 text-sm font-medium">
          <button
            role="tab" aria-selected={mode === "size"}
            onClick={() => setMode("size")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${mode === "size" ? "bg-ink text-white" : "text-foreground/70"}`}>
            <Ruler className="h-4 w-4" /> By Size
          </button>
          <button
            role="tab" aria-selected={mode === "vehicle"}
            onClick={() => setMode("vehicle")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${mode === "vehicle" ? "bg-ink text-white" : "text-foreground/70"}`}>
            <Car className="h-4 w-4" /> By Vehicle
          </button>
        </div>
      </div>

      {emptyInventory ? (
        <EmptyInventoryPrompt />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {mode === "size" ? (
            <>
              <Field label="Width">
                <select
                  aria-label="Tyre width" value={w ?? ""}
                  onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setW(v); setP(null); setR(null); }}
                  className="finder-select">
                  <option value="">{widths.isLoading ? "Loading…" : "Select width"}</option>
                  {(widths.data ?? []).map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="Profile">
                <select
                  aria-label="Tyre profile" value={p ?? ""} disabled={!w}
                  onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setP(v); setR(null); }}
                  className="finder-select">
                  <option value="">{!w ? "Select width first" : profiles.isLoading ? "Loading…" : "Select profile"}</option>
                  {(profiles.data ?? []).map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="Rim (R)">
                <select
                  aria-label="Rim size" value={r ?? ""} disabled={!w || !p}
                  onChange={(e) => setR(e.target.value ? Number(e.target.value) : null)}
                  className="finder-select">
                  <option value="">{!p ? "Select profile first" : rims.isLoading ? "Loading…" : "Select rim"}</option>
                  {(rims.data ?? []).map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </Field>
              <button
                onClick={onSubmitClick} disabled={submitDisabled}
                className="btn-primary h-11 self-end disabled:opacity-50">
                <Search className="h-4 w-4" /> Show Matching Tyres
              </button>
            </>
          ) : (
            <>
              <Field label="Make">
                <select
                  aria-label="Vehicle make" value={makeId ?? ""}
                  onChange={(e) => { const v = e.target.value || null; setMakeId(v); setModelId(null); setYear(null); setConfigId(null); }}
                  className="finder-select">
                  <option value="">{makes.isLoading ? "Loading…" : "Select make"}</option>
                  {(makes.data ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
              <Field label="Model">
                <select
                  aria-label="Vehicle model" value={modelId ?? ""} disabled={!makeId}
                  onChange={(e) => { const v = e.target.value || null; setModelId(v); setYear(null); setConfigId(null); }}
                  className="finder-select">
                  <option value="">{!makeId ? "Select make first" : models.isLoading ? "Loading…" : "Select model"}</option>
                  {(models.data ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
              <Field label="Year">
                <select
                  aria-label="Vehicle year" value={year ?? ""} disabled={!modelId}
                  onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setYear(v); setConfigId(null); }}
                  className="finder-select">
                  <option value="">{!modelId ? "Select model first" : yearOptions.length ? "Any year" : "No years yet"}</option>
                  {yearOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              {(configs.data ?? []).length > 0 ? (
                <Field label="Trim / engine">
                  <select
                    aria-label="Configuration" value={configId ?? ""}
                    onChange={(e) => setConfigId(e.target.value || null)}
                    className="finder-select">
                    <option value="">Any configuration</option>
                    {(configs.data ?? []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {[c.trim_name, c.engine_name, c.engine_capacity_cc ? `${c.engine_capacity_cc}cc` : null].filter(Boolean).join(" · ") || "Configuration"}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <button
                onClick={onSubmitClick} disabled={submitDisabled}
                className="btn-primary h-11 self-end disabled:opacity-50 sm:col-span-2 md:col-span-1">
                <Search className="h-4 w-4" /> Show Compatible
              </button>
              {modelId && !configs.isLoading && (configs.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground sm:col-span-2 md:col-span-4">
                  No verified specifications on file for this vehicle yet. You can still search — or ask our expert to confirm on WhatsApp.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function EmptyInventoryPrompt() {
  return (
    <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4 text-sm text-foreground/80">
      <p className="font-semibold text-ink">Our online catalogue is being updated.</p>
      <p className="mt-1">Tell us your tyre size or vehicle and our expert will reply on WhatsApp with the best options and today's price.</p>
    </div>
  );
}
