import { tyres } from "@/lib/tyres";
import { services } from "@/lib/services";
import { faqMatch } from "./faqs";
import { matchIntent, normalize } from "./intents";
import { saveInquiry, detectPriority } from "./leads";
import type {
  ConversationState,
  EngineResult,
  InquiryCategory,
  LeadCaptureState,
  UnresolvedInquiry,
} from "./types";

const CONFIDENCE_HIGH = 0.9;
const CONFIDENCE_LOW = 0.7;

const QUICK_ACTIONS = [
  "Find Tyres for My Car",
  "Check Tyre Price",
  "Wheel Alignment",
  "Wheel Balancing",
  "Lubricants",
  "Shop Location",
];

const HANDOVER_TEXT =
  "I've forwarded your conversation to the Ghafoor Motors team. A team member will respond as soon as possible.";

const SIZE_RE = /\b(\d{3})\s*[\/\-\s]\s*(\d{2})\s*[\/\-\s]?\s*r?\s*(\d{2})\b/i;

export function extractTyreSize(text: string): string | null {
  const m = text.match(SIZE_RE);
  if (!m) return null;
  return `${m[1]}/${m[2]} R${m[3]}`;
}

const VEHICLE_HINTS = [
  "corolla", "civic", "city", "alto", "swift", "cultus", "yaris",
  "sportage", "tucson", "fortuner", "wagonr", "mg hs", "picanto",
  "sorento", "br-v", "vitz", "prado", "hilux", "revo", "mira",
];
export function extractVehicle(text: string): string | null {
  const n = text.toLowerCase();
  for (const v of VEHICLE_HINTS)
    if (n.includes(v)) return v.replace(/\b\w/g, (c) => c.toUpperCase());
  return null;
}

const PHONE_RE = /(\+?92|0)?\s*3\d{2}[\s\-]?\d{7}/;
export function extractPhone(text: string): string | null {
  const m = text.replace(/[^\d+]/g, " ").match(/\+?\d{10,13}/);
  if (m) return m[0];
  const p = text.match(PHONE_RE);
  return p ? p[0].replace(/\s|-/g, "") : null;
}

export function extractName(text: string): string | null {
  const t = text.trim();
  // "I'm Ahmed" / "My name is Ahmed" / "Ahmed"
  const m = t.match(/(?:i['']?m|my name is|this is|main|mera naam)\s+([a-z][a-z\s'.-]{1,40})/i);
  if (m) return titleCase(m[1].trim());
  // Single/two-word name-only reply
  if (/^[a-z][a-z\s'.-]{1,40}$/i.test(t) && t.split(/\s+/).length <= 3) return titleCase(t);
  return null;
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const REFUSAL_RE =
  /\b(no|nope|nahi|nai|nahin|skip|later|baad me|baad mein|dont want|don't want|not now|cancel|reject)\b/i;
export function isRefusal(text: string): boolean {
  return REFUSAL_RE.test(text.trim());
}

const AFFIRM_RE = /\b(yes|yeah|yup|ok|okay|sure|haan|han|ji|ji han|ha|correct|confirm|theek)\b/i;
export function isAffirmative(text: string): boolean {
  return AFFIRM_RE.test(text.trim());
}

export function welcomeMessage(): EngineResult {
  return {
    text:
      "Assalam-o-Alaikum! Welcome to Ghafoor Motors Tyres & Lubricants. I can help you with tyres, lubricants, wheel services, prices, availability, and directions. What do you need today?",
    quickReplies: QUICK_ACTIONS,
    source: "welcome",
    confidence: 1,
  };
}

function tyreLookupBySize(size: string): { text: string; found: boolean } {
  const [wp, rim] = size.split(" R");
  const [w, p] = wp.split("/");
  const matches = tyres.filter((t) =>
    t.sizes.some((s) => {
      const [swp, sr] = s.split(" R");
      const [sw, sp] = swp.split("/");
      return sw === w && sp === p && sr === rim;
    }),
  );
  if (matches.length === 0) {
    return { text: "", found: false };
  }
  const top = matches.slice(0, 3);
  const lines = top.map(
    (t) =>
      `• ${t.brand} ${t.model} — ${size} — ${t.inStock ? "in stock" : "check with team"} (sample listing, price to confirm)`,
  );
  return {
    text: `Here are options I found for ${size}:\n${lines.join("\n")}\n\nPrices vary — reply "confirm price" and I'll forward this to the team.`,
    found: true,
  };
}

export function runEngine(input: string, state: ConversationState): EngineResult {
  const raw = input.trim();
  const n = normalize(raw);

  // If lead capture is active, that takes priority.
  if (state.leadCapture?.active) {
    const lr = continueLeadCapture(raw, state);
    if (lr) return lr;
  }

  // 1. Quick action exact match
  const qa = QUICK_ACTIONS.find((q) => q.toLowerCase() === n);
  if (qa) return handleQuickAction(qa, state);
  if (n === "talk to a person") return handleTalkToPerson(state);

  // 2. Active flow continuation
  if (state.flow) {
    const flowRes = continueFlow(raw, state);
    if (flowRes) return flowRes;
  }

  // 3. Tyre size — look up; if not found, start lead capture
  const size = extractTyreSize(raw);
  if (size) {
    const lookup = tyreLookupBySize(size);
    if (lookup.found) {
      return {
        text: lookup.text,
        quickReplies: ["Confirm price", "Book fitting"],
        source: "tyre_size",
        confidence: 0.95,
        intent: "tyre_price",
        entities: { tyreSize: size },
        nextState: { collected: { ...state.collected, tyreSize: size } },
      };
    }
    // Unknown size → start lead capture
    return startLeadCapture(
      raw,
      "Product Availability",
      { ...state, collected: { ...state.collected, tyreSize: size } },
      `I don't have confirmed availability for ${size} right now, but our team can check it for you.`,
      { askVehicle: true },
    );
  }

  // 4. Intent match
  const im = matchIntent(raw);
  if (im.intent && im.score >= CONFIDENCE_HIGH) return handleIntent(im.intent, raw, state, im.score);

  // 5. FAQ
  const fm = faqMatch(raw);
  if (fm.faq && fm.score >= CONFIDENCE_HIGH) {
    return {
      text: fm.faq.answer,
      source: "faq",
      confidence: fm.score,
      intent: fm.faq.category,
    };
  }

  // 6. Medium confidence — one targeted clarification
  if ((im.intent && im.score >= CONFIDENCE_LOW) || (fm.faq && fm.score >= CONFIDENCE_LOW)) {
    const label = im.label || fm.faq?.category || "your question";
    return {
      text: `Just to confirm — is your question about ${label}?`,
      quickReplies: ["Yes", "No, something else"],
      source: "clarify",
      confidence: Math.max(im.score, fm.score),
      intent: im.intent || fm.faq?.category,
    };
  }

  // 7. Unresolved → start lead capture instead of pushing to a person
  return startLeadCapture(
    raw,
    guessCategory(raw),
    state,
    "I don't have a confirmed answer for that yet, but I can have our team check it for you.",
    { askVehicle: mentionsVehicleTopic(raw), askTyreSize: mentionsTyreTopic(raw) },
  );
}

function mentionsVehicleTopic(t: string) {
  return /tyre|tire|oil|lubricant|alignment|balanc|fitment|install|car|gaari|gari|suv/i.test(t);
}
function mentionsTyreTopic(t: string) {
  return /tyre|tire|size|r1\d|r2\d/i.test(t);
}

function guessCategory(t: string): InquiryCategory {
  const n = t.toLowerCase();
  if (/price|rate|kitne|kitna|cost/.test(n)) return "Price Confirmation";
  if (/service|alignment|balanc|fitting|puncture|repair|nitrogen|oil change/.test(n))
    return "Service Confirmation";
  if (/fit|install|replace|instead of|change size|upsize|downsize/.test(n))
    return "Technical Confirmation";
  if (/tyre|tire|brand|available|stock|oil|lubricant/.test(n)) return "Product Availability";
  return "General Inquiry";
}

// ---------- Lead capture ----------

function startLeadCapture(
  originalQuestion: string,
  category: InquiryCategory,
  state: ConversationState,
  prefaceLine: string,
  opts: { askVehicle?: boolean; askTyreSize?: boolean } = {},
): EngineResult {
  const lc: LeadCaptureState = {
    active: true,
    step: "ask_name",
    originalQuestion,
    category,
    askVehicle: !!opts.askVehicle,
    askTyreSize: !!opts.askTyreSize,
    attempts: 1,
    refusals: 0,
    submitted: false,
  };

  // Skip name if we already know it
  if (state.collected.name) {
    return advanceLeadCapture({ ...state, leadCapture: lc }, prefaceLine);
  }

  return {
    text: `${prefaceLine} May I have your name?`,
    source: "lead_capture",
    confidence: 0.9,
    intent: "lead_capture",
    nextState: { leadCapture: lc },
  };
}

function advanceLeadCapture(state: ConversationState, prefix?: string): EngineResult {
  const lc = state.leadCapture!;
  const c = state.collected;

  // Step: name
  if (!c.name) {
    lc.step = "ask_name";
    return {
      text: `${prefix ? prefix + " " : ""}May I have your name?`,
      source: "lead_capture",
      confidence: 0.9,
      nextState: { leadCapture: { ...lc } },
    };
  }

  // Step: phone confirm / ask
  if (!c.phone || !c.phoneConfirmed) {
    if (state.knownPhone && !c.phone) {
      lc.step = "confirm_phone";
      return {
        text: `Thank you, ${c.name}. Should our team contact you on this WhatsApp number (${state.knownPhone})?`,
        quickReplies: ["Yes, this number", "Use a different number"],
        source: "lead_capture",
        confidence: 0.9,
        nextState: { leadCapture: { ...lc } },
      };
    }
    lc.step = "ask_phone";
    return {
      text: `Thank you, ${c.name}. What number should our team contact you on?`,
      source: "lead_capture",
      confidence: 0.9,
      nextState: { leadCapture: { ...lc } },
    };
  }

  // Step: clarified requirement
  if (!c.clarifiedRequirement) {
    lc.step = "clarify_requirement";
    return {
      text: "Please briefly confirm exactly what you need so I can send the correct details to our team.",
      source: "lead_capture",
      confidence: 0.9,
      nextState: { leadCapture: { ...lc } },
    };
  }

  // Optional vehicle
  if (lc.askVehicle && !c.vehicleModel) {
    lc.step = "ask_vehicle";
    return {
      text: "Which vehicle is this for? Please share make, model, and year (e.g. Toyota Corolla 2021).",
      quickReplies: ["Skip"],
      source: "lead_capture",
      confidence: 0.9,
      nextState: { leadCapture: { ...lc } },
    };
  }

  // Optional tyre size
  if (lc.askTyreSize && !c.tyreSize) {
    lc.step = "ask_tyre_size";
    return {
      text: "Before I send this, do you know your current tyre size? (e.g. 195/65 R15)",
      quickReplies: ["I Don't Know"],
      source: "lead_capture",
      confidence: 0.9,
      nextState: { leadCapture: { ...lc } },
    };
  }

  // Confirm summary
  lc.step = "confirm_summary";
  return {
    text: `${summarize(state)}\n\nShall I send this to the Ghafoor Motors team?`,
    quickReplies: ["Yes, send it", "Add More Information"],
    source: "lead_capture",
    confidence: 0.95,
    nextState: { leadCapture: { ...lc } },
  };
}

function summarize(state: ConversationState): string {
  const c = state.collected;
  const lc = state.leadCapture!;
  const parts: string[] = [];
  parts.push(`Here's what I have for you${c.name ? ", " + c.name : ""}:`);
  parts.push(`• Requirement: ${c.clarifiedRequirement || lc.originalQuestion}`);
  if (c.vehicleModel)
    parts.push(
      `• Vehicle: ${[c.vehicleMake, c.vehicleModel, c.vehicleYear].filter(Boolean).join(" ")}`,
    );
  if (c.tyreSize) parts.push(`• Tyre size: ${c.tyreSize}`);
  if (c.phone) parts.push(`• Contact: ${c.phone}`);
  return parts.join("\n");
}

function continueLeadCapture(raw: string, state: ConversationState): EngineResult | null {
  const lc = state.leadCapture!;
  const c = { ...state.collected };
  const trimmed = raw.trim();

  // Global refusal handling (only on info-gathering steps, not on confirm)
  const infoSteps: LeadCaptureState["step"][] = ["ask_name", "ask_phone", "confirm_phone"];
  if (infoSteps.includes(lc.step) && isRefusal(trimmed) && !isAffirmative(trimmed)) {
    const refusals = lc.refusals + 1;
    if (refusals >= 3) {
      const closed: LeadCaptureState = { ...lc, active: false, step: "closed", refusals };
      return {
        text:
          "No problem. You can message us anytime or call Ghafoor Motors on 0332-4443021 and we'll be glad to help.",
        source: "lead_closed",
        confidence: 1,
        nextState: { leadCapture: closed },
        quickReplies: ["Get Directions", "Call Ghafoor Motors"],
      };
    }
    const msg =
      refusals === 1
        ? "To make sure you receive the correct price and availability, I just need your name and contact number."
        : "You can simply share your name here. Our team can contact you on the same number.";
    return {
      text: msg,
      source: "lead_capture",
      confidence: 0.9,
      nextState: { leadCapture: { ...lc, refusals } },
    };
  }

  // Step handlers
  if (lc.step === "ask_name") {
    const name = extractName(trimmed);
    if (!name) {
      const attempts = lc.attempts + 1;
      return {
        text: "Sorry, I didn't catch your name. Could you type just your name, please?",
        source: "lead_capture",
        confidence: 0.6,
        nextState: { leadCapture: { ...lc, attempts } },
      };
    }
    c.name = name;
    return advanceLeadCapture({ ...state, collected: c });
  }

  if (lc.step === "confirm_phone") {
    if (/different|another|new number|dusra|doosra/i.test(trimmed) || (!isAffirmative(trimmed) && extractPhone(trimmed))) {
      const p = extractPhone(trimmed);
      if (p) {
        c.phone = p;
        c.phoneConfirmed = true;
        return advanceLeadCapture({ ...state, collected: c });
      }
      return {
        text: "Sure — please type the number our team should use.",
        source: "lead_capture",
        confidence: 0.8,
        nextState: { leadCapture: { ...lc, step: "ask_phone" } },
      };
    }
    if (isAffirmative(trimmed) && state.knownPhone) {
      c.phone = state.knownPhone;
      c.phoneConfirmed = true;
      return advanceLeadCapture({ ...state, collected: c });
    }
  }

  if (lc.step === "ask_phone") {
    const p = extractPhone(trimmed);
    if (!p) {
      return {
        text:
          "Please share a mobile number our team can reach you on (for example 0332-1234567).",
        source: "lead_capture",
        confidence: 0.6,
        nextState: { leadCapture: { ...lc, attempts: lc.attempts + 1 } },
      };
    }
    c.phone = p;
    c.phoneConfirmed = true;
    return advanceLeadCapture({ ...state, collected: c });
  }

  if (lc.step === "clarify_requirement") {
    c.clarifiedRequirement = trimmed;
    // Extract entities from the clarification too
    const s = extractTyreSize(trimmed);
    if (s) c.tyreSize = c.tyreSize || s;
    const v = extractVehicle(trimmed);
    if (v) c.vehicleModel = c.vehicleModel || v;
    return advanceLeadCapture({ ...state, collected: c });
  }

  if (lc.step === "ask_vehicle") {
    if (/^skip$/i.test(trimmed)) {
      return advanceLeadCapture({ ...state, collected: c, leadCapture: { ...lc, askVehicle: false } });
    }
    const v = extractVehicle(trimmed);
    const year = trimmed.match(/\b(19|20)\d{2}\b/)?.[0];
    c.vehicleModel = v || trimmed;
    if (year) c.vehicleYear = year;
    return advanceLeadCapture({ ...state, collected: c });
  }

  if (lc.step === "ask_tyre_size") {
    if (/don'?t know|dont know|no idea|nahi pata/i.test(trimmed)) {
      return advanceLeadCapture({
        ...state,
        collected: c,
        leadCapture: { ...lc, askTyreSize: false },
      });
    }
    const s = extractTyreSize(trimmed);
    if (s) c.tyreSize = s;
    return advanceLeadCapture({ ...state, collected: c });
  }

  if (lc.step === "confirm_summary") {
    if (/add more|more info|edit|change/i.test(trimmed)) {
      return {
        text:
          "Sure — what would you like to add or change? You can share vehicle details, tyre size, quantity, or a preferred callback time.",
        source: "lead_capture",
        confidence: 0.9,
        nextState: { leadCapture: { ...lc, step: "clarify_requirement" } },
      };
    }
    // Anything else = confirmation → submit
    const inquiry = buildInquiry(state);
    saveInquiry(inquiry);
    const closingLc: LeadCaptureState = { ...lc, active: false, step: "done", submitted: true };
    const contactLine = c.phone ? ` on ${c.phone}` : "";
    return {
      text: `Thank you${c.name ? ", " + c.name : ""}. I've shared your request for ${inquiry.clarifiedRequirement || inquiry.originalQuestion} with the Ghafoor Motors team. They will review the details and contact you${contactLine} as soon as possible during business hours.`,
      quickReplies: ["Add More Information", "Get Directions", "Call Ghafoor Motors"],
      source: "lead_submitted",
      confidence: 1,
      nextState: { leadCapture: closingLc },
      leadSubmitted: inquiry,
    };
  }

  return null;
}

function buildInquiry(state: ConversationState): UnresolvedInquiry {
  const c = state.collected;
  const lc = state.leadCapture!;
  const missing: string[] = [];
  if (!c.vehicleModel) missing.push("Vehicle");
  if (!c.tyreSize && lc.askTyreSize) missing.push("Tyre size");
  if (!c.preferredCallbackTime) missing.push("Preferred callback time");
  const requirement = c.clarifiedRequirement || lc.originalQuestion;
  return {
    id: `INQ-${Date.now().toString(36).toUpperCase()}`,
    customerName: c.name,
    phone: c.phone,
    whatsappNumber: state.channel === "whatsapp" ? state.knownPhone || c.phone : undefined,
    originalQuestion: lc.originalQuestion,
    clarifiedRequirement: c.clarifiedRequirement,
    inquiryCategory: lc.category,
    vehicleModel: c.vehicleModel,
    vehicleYear: c.vehicleYear,
    tyreSize: c.tyreSize,
    productRequested: /tyre|tire|oil|lubricant/i.test(requirement) ? requirement : undefined,
    serviceRequested: /alignment|balanc|fitting|puncture|nitrogen|repair/i.test(requirement)
      ? requirement
      : undefined,
    preferredCallbackTime: c.preferredCallbackTime,
    conversationSummary: summarize(state),
    missingInformation: missing,
    status: missing.length ? "Information Required" : "Ready for Follow-up",
    priority: detectPriority(requirement + " " + lc.originalQuestion),
    createdAt: Date.now(),
  };
}

// ---------- Standard handlers ----------

function handleTalkToPerson(state: ConversationState): EngineResult {
  return {
    text: HANDOVER_TEXT,
    source: "human",
    confidence: 1,
    intent: "human",
    triggerHumanHandover: true,
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
        quickReplies: ["Book Appointment", "How long does it take?"],
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
        quickReplies: ["Open in Google Maps", "Call 0332-4443021"],
        source: "quick_action",
        confidence: 1,
        intent: "location",
      };
  }
  return { text: "How can I help?", source: "quick_action", confidence: 1 };
}

function handleIntent(intent: string, raw: string, state: ConversationState, score: number): EngineResult {
  switch (intent) {
    case "human":
      return handleTalkToPerson(state);
    case "location":
      return handleQuickAction("Shop Location", state);
    case "hours": {
      // Hours not verified — capture lead instead of guessing
      return startLeadCapture(
        raw,
        "General Inquiry",
        state,
        "Our confirmed business hours haven't been added here yet, but the team can share today's timing.",
      );
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
        quickReplies: ["Book Appointment"],
        source: "flow",
        confidence: score,
        intent,
        nextState: { collected: { ...state.collected, service: "Wheel Balancing" } },
      };
    }
    case "nitrogen":
      return {
        text: "Nitrogen air filling is available for all vehicles. Walk in anytime.",
        source: "faq",
        confidence: score,
        intent,
      };
    case "fitting":
      return {
        text: "Yes, we do professional tyre fitting on-site. Are you buying new tyres today?",
        quickReplies: ["Yes", "Just fitting"],
        source: "flow",
        confidence: score,
        intent,
      };
    case "lubricant":
      return handleQuickAction("Lubricants", state);
    case "greeting":
      return {
        text: "Wa Alaikum Assalam! How can I help you today?",
        quickReplies: QUICK_ACTIONS.slice(0, 5),
        source: "quick_action",
        confidence: score,
        intent,
      };
    case "thanks":
      return {
        text: "You're welcome. Let me know if there's anything else.",
        source: "quick_action",
        confidence: score,
        intent,
      };
    case "warranty": {
      const fm = faqMatch("warranty");
      return {
        text: fm.faq?.answer ?? "Warranty depends on the brand.",
        source: "faq",
        confidence: score,
        intent,
      };
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
        text:
          "No problem. The tyre size is written on the sidewall like 195/65 R15. Type it here or send a clear sidewall photo.",
        source: "flow",
        confidence: 0.95,
        intent: "tyre_price",
      };
    }
  }

  if (id === "recommendation") {
    if (step === 1 && vehicle) {
      return {
        text: `Got it — ${vehicle}. What year is your car?`,
        source: "flow",
        confidence: 0.9,
        intent: "recommendation",
        nextState: {
          collected: { ...state.collected, vehicleModel: vehicle },
          flow: { id, step: 2 },
        },
      };
    }
    if (step === 2 && /\b(19|20)\d{2}\b/.test(raw)) {
      const year = raw.match(/\b(19|20)\d{2}\b/)![0];
      return {
        text: `Thanks. What's the current tyre size? (e.g. 195/65 R15). If you don't know, tell me.`,
        quickReplies: ["I don't know my size"],
        source: "flow",
        confidence: 0.9,
        intent: "recommendation",
        nextState: {
          collected: { ...state.collected, vehicleYear: year },
          flow: { id, step: 3 },
        },
      };
    }
    if (step === 3) {
      if (size) {
        const lookup = tyreLookupBySize(size);
        if (!lookup.found) {
          return startLeadCapture(
            `${state.collected.vehicleModel || ""} ${state.collected.vehicleYear || ""} tyres ${size}`.trim(),
            "Product Availability",
            {
              ...state,
              collected: { ...state.collected, tyreSize: size },
              flow: undefined,
            },
            `I don't have confirmed options for ${size} right now, but our team can check the best matches for your ${state.collected.vehicleModel || "vehicle"}.`,
          );
        }
        return {
          text: `${lookup.text}\n\nWhat matters most to you: Comfort, Fuel Efficiency, Highway, or Budget?`,
          quickReplies: ["Comfort", "Fuel Efficiency", "Highway", "Budget"],
          source: "tyre_size",
          confidence: 0.95,
          intent: "recommendation",
          nextState: {
            collected: { ...state.collected, tyreSize: size },
            flow: { id, step: 4 },
          },
        };
      }
    }
    if (step === 4) {
      // Capture as a lead with priority
      return startLeadCapture(
        `Tyre recommendation: ${state.collected.vehicleModel || ""} ${state.collected.vehicleYear || ""} ${state.collected.tyreSize || ""} — priority ${raw}`,
        "Price Confirmation",
        {
          ...state,
          collected: { ...state.collected, priority: raw },
          flow: undefined,
        },
        `Noted — priority is ${raw}. Our team will confirm today's price and stock.`,
      );
    }
  }

  if (id === "lubricant") {
    if (step === 1 && vehicle) {
      return startLeadCapture(
        `Engine oil for ${vehicle}`,
        "Product Availability",
        {
          ...state,
          collected: { ...state.collected, vehicleModel: vehicle },
          flow: undefined,
        },
        `Please confirm the required viscosity from your owner's manual. Our team can also confirm the right oil for your ${vehicle}.`,
      );
    }
  }

  return null;
}
