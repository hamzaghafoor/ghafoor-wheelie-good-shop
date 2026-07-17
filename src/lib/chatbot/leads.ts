import type { UnresolvedInquiry } from "./types";

const KEY = "gmtl_unresolved_inquiries";

export function saveInquiry(inq: UnresolvedInquiry) {
  if (typeof window === "undefined") return;
  try {
    const list = loadInquiries();
    list.unshift(inq);
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
    window.dispatchEvent(new CustomEvent("gmtl:unresolved-inquiry", { detail: inq }));
  } catch {
    /* noop */
  }
}

export function loadInquiries(): UnresolvedInquiry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UnresolvedInquiry[]) : [];
  } catch {
    return [];
  }
}

export function updateInquiry(id: string, patch: Partial<UnresolvedInquiry>) {
  if (typeof window === "undefined") return;
  const list = loadInquiries().map((i) => (i.id === id ? { ...i, ...patch } : i));
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("gmtl:unresolved-inquiry-updated"));
}

const HIGH_INTENT = [
  "price", "rate", "kitne", "kitna", "stock", "available", "mil jaye",
  "book", "appointment", "today", "aaj", "abhi", "quantity", "pieces",
  "callback", "call me", "call kar", "payment", "installment", "buy",
];

export function detectPriority(text: string): "Urgent" | "High Purchase Intent" | "Normal" {
  const n = text.toLowerCase();
  if (/urgent|emergency|abhi chahiye|fori/.test(n)) return "Urgent";
  if (HIGH_INTENT.some((k) => n.includes(k))) return "High Purchase Intent";
  return "Normal";
}
