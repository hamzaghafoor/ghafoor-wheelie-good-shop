import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { runEngine, extractTyreSize, extractVehicle } from "@/lib/chatbot/engine";
import { matchIntent } from "@/lib/chatbot/intents";
import { faqMatch } from "@/lib/chatbot/faqs";
import { ChatWindow } from "@/components/chat/ChatWindow";
import type { EngineResult } from "@/lib/chatbot/types";

export const Route = createFileRoute("/admin/testing-lab")({
  head: () => ({ meta: [{ title: "Conversation Testing Lab | GMTL Admin" }, { name: "robots", content: "noindex" }] }),
  component: TestingLab,
});

const EXAMPLES = [
  "Corolla 2021 tyre price?",
  "195 65 R15 available hai?",
  "Civic ke tyres chahiye",
  "Alignment kitne ki hai?",
  "Shop kidhar hai?",
  "Timing kya hai?",
  "Steering vibrate kar raha hai",
  "Gaari aik side pull kar rahi hai",
  "Engine oil available hai?",
  "Insaan se baat karni hai",
];

function TestingLab() {
  const [input, setInput] = useState("Corolla 2021 tyre price?");
  const [result, setResult] = useState<EngineResult | null>(null);
  const [meta, setMeta] = useState<{ intent?: string; intentScore?: number; faq?: string; faqScore?: number; size?: string | null; vehicle?: string | null }>({});

  function test(text: string) {
    setInput(text);
    const im = matchIntent(text);
    const fm = faqMatch(text);
    const r = runEngine(text, { automationEnabled: true, humanRequested: false, collected: {} });
    setResult(r);
    setMeta({
      intent: im.intent, intentScore: im.score,
      faq: fm.faq?.question, faqScore: fm.score,
      size: extractTyreSize(text), vehicle: extractVehicle(text),
    });
  }

  return (
    <div className="container-x py-10">
      <div className="mb-6">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 font-display text-3xl">Conversation Testing Lab</h1>
        <p className="mt-2 text-sm text-muted-foreground">Test how the chatbot understands a customer message before it goes live. Uses local rule-based engine + FAQ database.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <div className="card-surface p-5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer message</label>
            <div className="mt-2 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && test(input)}
                className="h-11 flex-1 rounded-md border border-border bg-surface px-3 text-sm" />
              <button onClick={() => test(input)} className="btn-primary text-sm">Analyze</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {EXAMPLES.map((e) => (
                <button key={e} onClick={() => test(e)} className="rounded-full border border-border bg-surface px-3 py-1 text-xs hover:border-primary hover:text-primary">{e}</button>
              ))}
            </div>
          </div>

          {result && (
            <div className="card-surface p-5">
              <h2 className="font-display text-lg">Engine analysis</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Row label="Detected intent" value={meta.intent ? `${meta.intent} (${Math.round((meta.intentScore || 0) * 100)}%)` : "—"} />
                <Row label="FAQ match" value={meta.faq ? `${meta.faq} (${Math.round((meta.faqScore || 0) * 100)}%)` : "—"} />
                <Row label="Tyre size extracted" value={meta.size || "—"} />
                <Row label="Vehicle detected" value={meta.vehicle || "—"} />
                <Row label="Response source" value={result.source} />
                <Row label="Confidence" value={`${Math.round(result.confidence * 100)}%`} />
                <Row label="Would call AI fallback?" value={result.source === "ai_fallback" ? "Yes (placeholder)" : "No"} />
                <Row label="Human escalation?" value={result.triggerHumanHandover ? "Yes" : "No"} />
              </dl>
              <div className="mt-4 border-t border-border pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Final response</div>
                <div className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{result.text}</div>
                {!!result.quickReplies?.length && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.quickReplies.map((q) => <span key={q} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs">{q}</span>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live simulator</div>
          <div className="h-[560px]"><ChatWindow embedded /></div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}
