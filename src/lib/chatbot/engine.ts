import { tyres } from "@/lib/tyres";
import { services } from "@/lib/services";
import { faqMatch } from "./faqs";
import { matchIntent, normalize } from "./intents";
import type { ConversationState, EngineResult } from "./types";

const CONFIDENCE_HIGH = 0.9;
const CONFIDENCE_LOW = 0.7;

const QUICK_ACTIONS = [
  "Find Tyres for My Car",
  "Check Tyre Price",
  "Wheel Alignment",
  "Wheel Balancing",
  "Lubricants",
  "Shop Location",
  "Talk to a Person",
];

const HANDOVER_TEXT = "I've forwarded your conversation to the Ghafoor Motors team. A team member will respond as soon as possible.";

// Tyre size patterns: 195/65 R15, 195 65 15, 195-65-r15
const SIZE_RE = /\b(\d{3})\s*[\/\-\s]\s*(\d{2})\s*[\/\-\s]?\s*r?\s*(\d{2})\b/i;

export function extractTyreSize(text: string): string | null {
  const m = text.match(SIZE_RE);
  if (!m) return null;
  return `${m[1]}/${m[2]} R${m[3]}`;
}

const VEHICLE_HINTS = ["corolla", "civic", "city", "alto", "swift", "cultus", "yaris", "sportage", "tucson", "fortuner", "wagonr", "mg hs", "picanto", "sorento", "br-v"];
export function extractVehicle(text: string): string | null {
  const n = text.toLowerCase();
  for (const v of VEHICLE_HINTS) if (n.includes(v)) return v.replace(/\b\w/g, (c) => c.toUpperCase());
  return null;
}

export function welcomeMessage(): EngineResult {
  return {
    text: "Assalam-o-Alaikum! Welcome to Ghafoor Motors Tyres & Lubricants. I can help you with tyres, lubricants, wheel services, prices, availability, and directions. What do you need today?",
    quickReplies: QUICK_ACTIONS,
    source: "welcome",
    confidence: 1,
  };
}

function tyreLookupBySize(size: string): string {
  const [wp, rim] = size.split(" R");
  const [w, p] = wp.split("/");
  const matches = tyres.filter((t) => t.sizes.some((s) => {
    const [swp, sr] = s.split(" R");
    const [sw, sp] = swp.split("/");
    return sw === w && sp === p && sr === rim;
  }));
  if (matches.length === 0) {
    return `I couldn't find a confirmed option for ${size} in the current list. I can forward your requirement to our team for confirmation.`;
  }
  const top = matches.slice(0, 3);
  const lines = top.map((t) => `• ${t.brand} ${t.model} — ${size} — ${t.inStock ? "in stock" : "check with team"} (sample listing, price to confirm)`);
  return `Here are options I found for ${size}:\n${lines.join("\n")}\n\nPrices vary — reply "confirm price" and I'll forward this to the team.`;
}

export function runEngine(input: string, state: ConversationState): EngineResult {
  const raw = input.trim();
  const n = normalize(raw);

  // 1. Quick action exact match
  const qa = QUICK_ACTIONS.find((q) => q.toLowerCase() === n);
  if (qa) return handleQuickAction(qa, state);

  // 2. Active flow continuation
  if (state.flow) {
    const flowRes = continueFlow(raw, state);
    if (flowRes) return flowRes;
  }

  // 3. Tyre size
  const size = extractTyreSize(raw);
  if (size) {
    return {
      text: tyreLookupBySize(size),
      quickReplies: ["Confirm price", "Talk to a Person"],
      source: "tyre_size",
      confidence: 0.95,
      intent: "tyre_price",
      entities: { tyreSize: size },
      nextState: { collected: { ...state.collected, tyreSize: size } },
    };
  }

  // 4. Intent match
  const im = matchIntent(raw);
  if (im.intent && im.score >= CONFIDENCE_HIGH) return handleIntent(im.intent, raw, state, im.score);

  // 5. FAQ
  const fm = faqMatch(raw);
  if (fm.faq && fm.score >= CONFIDENCE_HIGH) {
    return { text: fm.faq.answer, source: "faq", confidence: fm.score, intent: fm.faq.category, quickReplies: ["Talk to a Person"] };
  }

  // 6. Medium confidence — clarify
  if ((im.intent && im.score >= CONFIDENCE_LOW) || (fm.faq && fm.score >= CONFIDENCE_LOW)) {
    const label = im.label || fm.faq?.category || "your question";
    return {
      text: `Just to confirm — is your question about ${label}?`,
      quickReplies: ["Yes", "No, talk to a person"],
      source: "clarify",
      confidence: Math.max(im.score, fm.score),
      intent: im.intent || fm.faq?.category,
    };
  }

  // 7. AI fallback placeholder / human handover
  return {
    text: "I'm not sure I understood that. Would you like me to connect you with the Ghafoor Motors team?",
    quickReplies: ["Talk to a Person", ...QUICK_ACTIONS.slice(0, 4)],
    source: "ai_fallback",
    confidence: 0.4,
  };
}

function handleQuickAction(qa: string, state: ConversationState): EngineResult {
  switch (qa) {
    case "Find Tyres for My Car":
      return {
        text: "Sure. What's your car make and model? (e.g. Toyota Corolla 2021)",
        source: "flow",
        confidence: 1,
        intent: "recommendation",
        nextState: { flow: { id: "recommendation", step: 1 } },
      };
    case "Check Tyre Price":
      return {
        text: "Please share your tyre size, for example 195/65 R15. If you're not sure, I can guide you.",
        quickReplies: ["I don't know my size"],
        source: "flow",
        confidence: 1,
        intent: "tyre_price",
        nextState: { flow: { id: "tyre_price", step: 1 } },
      };
    case "Wheel Alignment":
    case "Wheel Balancing":
      return {
        text: `${qa} is available at our shop. Would you like to request an appointment?`,
        quickReplies: ["Book Appointment", "How long does it take?", "Talk to a Person"],
        source: "flow",
        confidence: 1,
        intent: qa.toLowerCase(),
        nextState: { collected: { ...state.collected, service: qa } },
      };
    case "Lubricants":
      return {
        text: "For the right engine oil, please share your car make, model, and year.",
        source: "flow",
        confidence: 1,
        intent: "lubricant",
        nextState: { flow: { id: "lubricant", step: 1 } },
      };
    case "Shop Location":
      return {
        text: "Ghafoor Motors Tyres & Lubricants is at Shop No. 2, Plot No. 107-D, Block 2, PECHS, Khalid Bin Waleed Road, Karachi.",
        quickReplies: ["Open in Google Maps", "Call 0332-4443021", "Message the Team"],
        source: "quick_action",
        confidence: 1,
        intent: "location",
      };
    case "Talk to a Person":
      return {
        text: HANDOVER_TEXT,
        source: "human",
        confidence: 1,
        intent: "human",
        triggerHumanHandover: true,
      };
  }
  return { text: "How can I help?", source: "quick_action", confidence: 1 };
}

function handleIntent(intent: string, raw: string, state: ConversationState, score: number): EngineResult {
  switch (intent) {
    case "human":
      return { text: HANDOVER_TEXT, source: "human", confidence: score, intent, triggerHumanHandover: true };
    case "location":
      return handleQuickAction("Shop Location", state);
    case "hours": {
      const fm = faqMatch("timing");
      return { text: fm.faq?.answer || "Please contact the team for timings.", source: "faq", confidence: score, intent };
    }
    case "tyre_price":
    case "availability":
      return handleQuickAction("Check Tyre Price", state);
    case "alignment":
      return handleQuickAction("Wheel Alignment", state);
    case "balancing": {
      const svc = services.find((s) => s.id === "balancing");
      return {
        text: `${svc?.description ?? "Wheel balancing helps reduce vibration."} Warning signs: ${svc?.signs.join(", ")}. Would you like to book?`,
        quickReplies: ["Book Appointment", "Talk to a Person"],
        source: "flow", confidence: score, intent,
        nextState: { collected: { ...state.collected, service: "Wheel Balancing" } },
      };
    }
    case "nitrogen":
      return { text: "Nitrogen air filling is available for all vehicles. Walk in anytime.", source: "faq", confidence: score, intent };
    case "fitting":
      return { text: "Yes, we do professional tyre fitting on-site. Are you buying new tyres today?", quickReplies: ["Yes", "Just fitting"], source: "flow", confidence: score, intent };
    case "lubricant":
      return handleQuickAction("Lubricants", state);
    case "greeting":
      return { text: "Wa Alaikum Assalam! How can I help you today?", quickReplies: QUICK_ACTIONS.slice(0, 5), source: "quick_action", confidence: score, intent };
    case "thanks":
      return { text: "You're welcome. Let me know if there's anything else.", source: "quick_action", confidence: score, intent };
    case "warranty": {
      const fm = faqMatch("warranty");
      return { text: fm.faq?.answer ?? "Warranty depends on the brand.", source: "faq", confidence: score, intent };
    }
  }
  return { text: "How can I help further?", source: "quick_action", confidence: score, intent };
}

function continueFlow(raw: string, state: ConversationState): EngineResult | null {
  if (!state.flow) return null;
  const { id, step } = state.flow;
  const size = extractTyreSize(raw);
  const vehicle = extractVehicle(raw);

  if (id === "tyre_price") {
    if (raw.toLowerCase().includes("don't know") || raw.toLowerCase().includes("dont know")) {
      return {
        text: "No problem. The tyre size is written on the sidewall like 195/65 R15. Type it here or send a clear sidewall photo.",
        source: "flow", confidence: 0.95, intent: "tyre_price",
      };
    }
  }

  if (id === "recommendation") {
    if (step === 1 && vehicle) {
      return {
        text: `Got it — ${vehicle}. What year is your car?`,
        source: "flow", confidence: 0.9, intent: "recommendation",
        nextState: { collected: { ...state.collected, vehicleModel: vehicle }, flow: { id, step: 2 } },
      };
    }
    if (step === 2 && /\b(19|20)\d{2}\b/.test(raw)) {
      const year = raw.match(/\b(19|20)\d{2}\b/)![0];
      return {
        text: `Thanks. What's the current tyre size? (e.g. 195/65 R15). If you don't know, tell me.`,
        quickReplies: ["I don't know my size"],
        source: "flow", confidence: 0.9, intent: "recommendation",
        nextState: { collected: { ...state.collected, vehicleYear: year }, flow: { id, step: 3 } },
      };
    }
    if (step === 3) {
      if (size) {
        return {
          text: `${tyreLookupBySize(size)}\n\nWhat matters most to you: Comfort, Fuel Efficiency, Highway, or Budget?`,
          quickReplies: ["Comfort", "Fuel Efficiency", "Highway", "Budget"],
          source: "tyre_size", confidence: 0.95, intent: "recommendation",
          nextState: { collected: { ...state.collected, tyreSize: size }, flow: { id, step: 4 } },
        };
      }
    }
    if (step === 4) {
      return {
        text: `Noted: priority is ${raw}. Please share your name and phone number so the team can confirm today's price and stock.`,
        source: "flow", confidence: 0.9, intent: "recommendation",
        nextState: { collected: { ...state.collected, priority: raw }, flow: undefined },
      };
    }
  }

  if (id === "lubricant") {
    if (step === 1 && vehicle) {
      return {
        text: `Please confirm the required viscosity and specification from your vehicle owner's manual before purchasing. Would you like the team to confirm the right oil for your ${vehicle}?`,
        quickReplies: ["Yes, ask the team", "Talk to a Person"],
        source: "flow", confidence: 0.9, intent: "lubricant",
        nextState: { collected: { ...state.collected, vehicleModel: vehicle }, flow: undefined },
      };
    }
  }

  return null;
}
