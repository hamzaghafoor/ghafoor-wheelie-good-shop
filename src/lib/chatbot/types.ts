export type MessageSource = "user" | "bot" | "human" | "system";
export type ResponseSource =
  | "quick_action"
  | "flow"
  | "tyre_size"
  | "faq"
  | "keyword"
  | "product_lookup"
  | "clarify"
  | "ai_fallback"
  | "human"
  | "welcome"
  | "lead_capture"
  | "lead_submitted"
  | "lead_closed";

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

export type LeadCaptureStep =
  | "ask_name"
  | "confirm_phone"
  | "ask_phone"
  | "clarify_requirement"
  | "ask_vehicle"
  | "ask_tyre_size"
  | "confirm_summary"
  | "done"
  | "closed";

export type LeadCaptureState = {
  active: boolean;
  step: LeadCaptureStep;
  originalQuestion: string;
  category: InquiryCategory;
  askVehicle: boolean;
  askTyreSize: boolean;
  attempts: number; // times we've asked for name/phone
  refusals: number; // times customer declined details
  submitted: boolean;
};

export type ConversationState = {
  automationEnabled: boolean;
  humanRequested: boolean;
  flow?: FlowState;
  leadCapture?: LeadCaptureState;
  channel?: "web" | "whatsapp";
  knownPhone?: string; // pre-populated if we're inside a WhatsApp session
  collected: {
    name?: string;
    phone?: string;
    phoneConfirmed?: boolean;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    tyreSize?: string;
    service?: string;
    product?: string;
    preferredDate?: string;
    preferredTime?: string;
    preferredCallbackTime?: string;
    priority?: string;
    clarifiedRequirement?: string;
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
  leadSubmitted?: UnresolvedInquiry;
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
  phrases: string[];
};

export type InquiryCategory =
  | "Product Availability"
  | "Price Confirmation"
  | "Service Confirmation"
  | "Technical Confirmation"
  | "General Inquiry";

export type InquiryStatus =
  | "New"
  | "Information Required"
  | "Ready for Follow-up"
  | "Assigned"
  | "Team Responded"
  | "Resolved"
  | "Converted"
  | "Closed";

export type InquiryPriority = "Urgent" | "High Purchase Intent" | "Normal" | "Low";

export type UnresolvedInquiry = {
  id: string;
  customerName?: string;
  phone?: string;
  whatsappNumber?: string;
  originalQuestion: string;
  clarifiedRequirement?: string;
  inquiryCategory: InquiryCategory;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleVariant?: string;
  tyreSize?: string;
  productRequested?: string;
  serviceRequested?: string;
  preferredCallbackTime?: string;
  conversationSummary: string;
  missingInformation: string[];
  status: InquiryStatus;
  priority: InquiryPriority;
  createdAt: number;
  assignedTo?: string;
};
