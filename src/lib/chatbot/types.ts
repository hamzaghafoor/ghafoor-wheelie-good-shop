export type MessageSource = "user" | "bot" | "human" | "system";
export type ResponseSource = "quick_action" | "flow" | "tyre_size" | "faq" | "keyword" | "product_lookup" | "clarify" | "ai_fallback" | "human" | "welcome";

export type ChatMessage = {
  id: string;
  sender: MessageSource;
  text: string;
  quickReplies?: string[];
  source?: ResponseSource;
  confidence?: number;
  intent?: string;
  createdAt: number;
};

export type ConversationState = {
  automationEnabled: boolean;
  humanRequested: boolean;
  flow?: FlowState;
  collected: {
    name?: string;
    phone?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    tyreSize?: string;
    service?: string;
    preferredDate?: string;
    preferredTime?: string;
    priority?: string;
  };
};

export type FlowId = "tyre_price" | "service_booking" | "lubricant" | "recommendation";
export type FlowState = { id: FlowId; step: number };

export type EngineResult = {
  text: string;
  quickReplies?: string[];
  source: ResponseSource;
  confidence: number;
  intent?: string;
  entities?: Record<string, string>;
  triggerHumanHandover?: boolean;
  nextState?: Partial<ConversationState>;
};

export type FAQ = {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  romanUrdu: string[];
};

export type IntentDef = {
  id: string;
  label: string;
  phrases: string[]; // English + Roman Urdu + Urdu
};
