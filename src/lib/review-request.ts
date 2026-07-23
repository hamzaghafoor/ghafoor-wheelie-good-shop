import { business, waLink } from "./business";

export const GOOGLE_REVIEW_URL = "https://g.page/r/CWmjhUF5GiY3EBM/review";

export function qrUrl(data: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function buildReviewMessage(customerName?: string): string {
  const name = (customerName || "").trim();
  const greet = name ? `Assalam-o-Alaikum ${name},` : "Assalam-o-Alaikum,";
  return [
    greet,
    `Thank you for choosing ${business.name}. It was a pleasure serving you.`,
    `If you're happy with our service, would you kindly share a quick Google review? It really helps our small team.`,
    `👉 ${GOOGLE_REVIEW_URL}`,
    `Shukriya!`,
  ].join("\n\n");
}

export function normalizeWhatsAppNumber(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return "92" + digits.slice(1);
  if (digits.startsWith("3") && digits.length === 10) return "92" + digits;
  return digits;
}

export function buildReviewWaLink(phone: string, customerName?: string): string {
  const msg = buildReviewMessage(customerName);
  const num = normalizeWhatsAppNumber(phone);
  return num
    ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
    : waLink(msg);
}
