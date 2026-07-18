import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { getSectionAdmin, upsertSection } from "@/lib/sections.functions";

export const Route = createFileRoute("/_authenticated/admin/sections/$id")({
  component: SectionEditor,
});

function SectionEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOne = useServerFn(getSectionAdmin);
  const upsert = useServerFn(upsertSection);

  const q = useQuery({ queryKey: ["adm-section", id], queryFn: () => fetchOne({ data: { id } }) });
  const [name, setName] = useState("");
  const [configText, setConfigText] = useState("{}");
  const [order, setOrder] = useState(0);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  useEffect(() => {
    if (q.data) {
      setName(q.data.name);
      setConfigText(JSON.stringify(q.data.config ?? {}, null, 2));
      setOrder(q.data.display_order ?? 0);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: (status: "draft" | "published") => {
      let cfg: any = {};
      try { cfg = JSON.parse(configText); } catch (e: any) { throw new Error("Config JSON invalid: " + e.message); }
      return upsert({ data: { id, type: q.data!.type, name, config: cfg, display_order: order, is_visible: q.data!.is_visible, status } });
    },
    onSuccess: (_r, status) => {
      qc.invalidateQueries({ queryKey: ["adm-sections"] });
      setMsg({ ok: `Saved as ${status}.` });
      setTimeout(() => navigate({ to: "/admin/sections" }), 500);
    },
    onError: (e: any) => setMsg({ err: e.message }),
  });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (q.error || !q.data) return <div className="text-sm text-red-600">Section not found.</div>;

  const s = q.data;
  const hint = HINTS[s.type as keyof typeof HINTS];

  return (
    <div className="max-w-3xl">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">Section · {s.type}</div>
      <h1 className="mt-1 font-display text-2xl">{s.name}</h1>

      <div className="mt-6 space-y-4">
        <Field label="Section name (internal)"><input value={name} onChange={(e) => setName(e.target.value)} className={inp} /></Field>
        <Field label="Display order"><input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className={inp} /></Field>

        {hint && (
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="mb-1 font-semibold text-ink">Suggested config keys</div>
            <pre className="whitespace-pre-wrap font-mono text-[11px]">{JSON.stringify(hint, null, 2)}</pre>
          </div>
        )}

        <Field label="Config (JSON)">
          <textarea rows={14} value={configText} onChange={(e) => setConfigText(e.target.value)} className={`${inp} h-auto font-mono text-xs`} />
        </Field>

        {msg.err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
        {msg.ok && <div className="rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}

        <div className="flex gap-2 pt-2">
          <button disabled={save.isPending} onClick={() => save.mutate("draft")} className="btn-outline text-sm">Save Draft</button>
          <button disabled={save.isPending} onClick={() => save.mutate("published")} className="btn-primary text-sm">Save & Publish</button>
          <button onClick={() => navigate({ to: "/admin/sections" })} className="ml-auto text-xs text-muted-foreground hover:text-ink">Cancel</button>
        </div>
      </div>
    </div>
  );
}

const HINTS: Record<string, any> = {
  hero: { headline: "Premium tyres, expertly fitted", subheadline: "…", primary_cta: { label: "WhatsApp us", href: "https://wa.me/…" }, secondary_cta: { label: "Browse tyres", href: "/tyres" }, image_url: "" },
  featured_brands: { title: "Trusted brands", subtitle: "" },
  featured_tyres: { title: "Popular tyres", subtitle: "", show_price: true },
  services: { title: "Services", items: [{ title: "Wheel balancing", icon: "wrench" }] },
  testimonials: { title: "What customers say", items: [{ name: "", quote: "" }] },
  location: { title: "Visit us", show_map: true },
  cta: { headline: "", primary_cta: { label: "", href: "" } },
};

const inp = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>;
}
