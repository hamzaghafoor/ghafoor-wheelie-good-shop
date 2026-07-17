import type { IntentDef } from "./types";

// Editable intent + Roman Urdu synonym library.
export const intents: IntentDef[] = [
  {
    id: "tyre_price",
    label: "Tyre Price / Availability",
    phrases: [
      "tyre price", "tyre rate", "price kya hai", "kitne ka hai", "kitne ka milega",
      "rate bata dein", "rate batao", "tyre kitne ka hai", "price check", "price bata dein",
      "tyre ka rate", "kitna", "tire price", "how much", "cost", "quote",
    ],
  },
  {
    id: "availability",
    label: "Stock / Availability",
    phrases: [
      "available", "available hai", "stock", "stock mein hai", "mil jayega", "mil jaye ga",
      "para hua hai", "stock check", "in stock", "hai ap ke pas", "milega",
    ],
  },
  {
    id: "alignment",
    label: "Wheel Alignment",
    phrases: [
      "alignment", "wheel alignment", "gari side pe ja rahi hai", "car pull kar rahi hai",
      "steering seedha nahi", "tyre aik side se ghis raha hai", "pulling to one side",
      "side pe jati hai", "steering off centre",
    ],
  },
  {
    id: "balancing",
    label: "Wheel Balancing",
    phrases: [
      "balancing", "wheel balancing", "steering hilta hai", "vibration", "vibrate",
      "speed pe gari vibrate", "wheel shake", "steering shake", "hilti hai gari",
      "kampan", "shake at speed",
    ],
  },
  {
    id: "nitrogen",
    label: "Nitrogen Air",
    phrases: ["nitrogen", "nitro", "nitrogen filling", "gas filling"],
  },
  {
    id: "location",
    label: "Location / Address",
    phrases: [
      "shop kidhar hai", "address", "address send", "location", "location bhejein",
      "kahan par hain", "kahan ho", "map", "map bhej", "directions", "where are you",
      "shop kahan hai", "reach", "pta",
    ],
  },
  {
    id: "hours",
    label: "Opening Hours",
    phrases: [
      "timing", "opening hours", "kab khulti hai", "kab open hai", "kitne baje",
      "hours", "closing time", "band kab", "khulti kab",
    ],
  },
  {
    id: "lubricant",
    label: "Lubricants / Engine Oil",
    phrases: [
      "engine oil", "oil change", "lubricant", "mobil oil", "gear oil", "atf",
      "brake fluid", "coolant", "oil available", "oil chahiye", "oil kitne ka",
    ],
  },
  {
    id: "human",
    label: "Human Handover",
    phrases: [
      "human", "talk to a person", "banda chahiye", "staff se baat", "representative",
      "owner se baat", "call kar dein", "insaan se baat", "agent", "manager",
      "real person", "kisi se baat",
    ],
  },
  {
    id: "greeting",
    label: "Greeting",
    phrases: ["hi", "hello", "salam", "assalam", "assalamualaikum", "aoa", "hey", "salaam"],
  },
  {
    id: "thanks",
    label: "Thanks",
    phrases: ["thanks", "thank you", "shukriya", "jazakallah", "mehrbani"],
  },
  {
    id: "fitting",
    label: "Tyre Fitting",
    phrases: ["fitting", "tyre fitting", "install", "mount tyre", "lagana"],
  },
  {
    id: "warranty",
    label: "Warranty",
    phrases: ["warranty", "guarantee", "zamanat"],
  },
];

export function normalize(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF/\s]/gi, " ").replace(/\s+/g, " ").trim();
}

export function matchIntent(input: string): { intent?: string; score: number; label?: string } {
  const n = normalize(input);
  let best = { intent: undefined as string | undefined, score: 0, label: undefined as string | undefined };
  for (const it of intents) {
    for (const p of it.phrases) {
      const np = normalize(p);
      if (!np) continue;
      if (n === np) return { intent: it.id, score: 1, label: it.label };
      if (n.includes(np)) {
        const s = Math.min(0.95, 0.6 + np.length / n.length * 0.35);
        if (s > best.score) best = { intent: it.id, score: s, label: it.label };
      }
    }
  }
  return best;
}
