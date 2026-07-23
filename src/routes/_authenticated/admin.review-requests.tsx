import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, MessageCircle, QrCode, Check, ExternalLink, Download } from "lucide-react";
import { GOOGLE_REVIEW_URL, buildReviewMessage, buildReviewWaLink, normalizeWhatsAppNumber, qrUrl } from "@/lib/review-request";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/admin/review-requests")({
  head: () => ({ meta: [{ title: "Review Requests | GMTL Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ReviewRequestCentre,
});

function ReviewRequestCentre() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState<"msg" | "link" | null>(null);
  const [showQR, setShowQR] = useState(false);

  const message = useMemo(() => buildReviewMessage(name), [name]);
  const waHref = useMemo(() => buildReviewWaLink(phone, name), [phone, name]);
  const validPhone = normalizeWhatsAppNumber(phone).length >= 11;

  async function copy(text: string, kind: "msg" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
      if (kind === "link") track("review_link_copied", { via: "admin" });
    } catch {}
  }

  function sendWA() {
    if (!validPhone) return;
    track("review_request_created", { has_name: !!name.trim() });
    track("review_whatsapp_opened", {});
    window.open(waHref, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <h1 className="font-display text-2xl">Review Request Centre</h1>
        <p className="text-sm text-muted-foreground">Send a Google review request to a customer over WhatsApp using the official review link. Google does not confirm submissions, so we only track that a request was sent.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <div className="rounded-lg border border-border bg-white p-5 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Customer name <span className="text-muted-foreground font-normal">(optional)</span></span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed"
              className="h-10 w-full rounded-md border border-border px-3" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">WhatsApp number</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XX-XXXXXXX"
              inputMode="tel" className="h-10 w-full rounded-md border border-border px-3" />
            {phone && !validPhone && <span className="mt-1 block text-xs text-red-600">Enter a valid Pakistani mobile number.</span>}
          </label>

          <div className="rounded-md border border-border bg-surface p-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview message</div>
            <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans">{message}</pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={sendWA} disabled={!validPhone}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <MessageCircle className="h-4 w-4" /> Send via WhatsApp
            </button>
            <button onClick={() => copy(message, "msg")} className="btn-outline text-sm">
              {copied === "msg" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy Message
            </button>
            <button onClick={() => copy(GOOGLE_REVIEW_URL, "link")} className="btn-outline text-sm">
              {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy Link
            </button>
            <button onClick={() => setShowQR((v) => !v)} className="btn-outline text-sm">
              <QrCode className="h-4 w-4" /> {showQR ? "Hide" : "Show"} QR Code
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Official Google review link</div>
          <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 break-all text-sm text-primary hover:underline">
            {GOOGLE_REVIEW_URL} <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {showQR && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <img src={qrUrl(GOOGLE_REVIEW_URL, 240)} alt="Google review QR code" width={240} height={240}
                className="rounded-md border border-border" />
              <a href={qrUrl(GOOGLE_REVIEW_URL, 600)} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Download className="h-3.5 w-3.5" /> Open printable QR (600px)
              </a>
              <p className="text-center text-xs text-muted-foreground">Print for the counter or add to receipts. Scanning opens the official review form.</p>
            </div>
          )}

          <div className="mt-5 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
            Note: Google does not notify us when a customer actually submits a review. We only track that a request was created, WhatsApp was opened, or the link was copied.
          </div>
        </div>
      </div>
    </div>
  );
}
