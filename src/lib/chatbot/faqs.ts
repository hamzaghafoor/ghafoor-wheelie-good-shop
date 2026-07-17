import type { FAQ } from "./types";

// 30+ demo FAQs. Answers are safe defaults — team can override.
export const faqs: FAQ[] = [
  { id: "f1", category: "Location", question: "Where is your shop?", answer: "Ghafoor Motors is at Shop No. 2, Plot No. 107-D, Block 2, PECHS, Khalid Bin Waleed Road, Karachi.", keywords: ["shop", "address", "where"], romanUrdu: ["shop kidhar", "address send", "location bhejein"] },
  { id: "f2", category: "Location", question: "Can you share Google Maps link?", answer: "Certainly — I can share our Google Maps location. Would you like me to send it here?", keywords: ["google maps", "map link"], romanUrdu: ["map bhej dein", "google map"] },
  { id: "f3", category: "Opening Hours", question: "What are your timings?", answer: "Our confirmed business hours haven't been added here yet. I can connect you with the team for confirmation.", keywords: ["timing", "hours", "open"], romanUrdu: ["kab khulti", "timing kya"] },
  { id: "f4", category: "Tyres", question: "Do you have tyres for my car?", answer: "Yes, we stock tyres for most cars in Karachi. Please share your car model and current tyre size (for example 195/65 R15).", keywords: ["tyres for car", "car tyre"], romanUrdu: ["gaari ke tyre", "car ka tyre"] },
  { id: "f5", category: "Prices", question: "What is the price of a tyre?", answer: "Prices depend on the brand and size. Please share your tyre size (like 195/65 R15) and I'll show verified options.", keywords: ["price", "rate", "cost"], romanUrdu: ["kitne ka", "rate bata"] },
  { id: "f6", category: "Prices", question: "Do prices change?", answer: "Yes, tyre prices can change with import rates. We confirm current price with the team before every order.", keywords: ["price change"], romanUrdu: ["rate change"] },
  { id: "f7", category: "Availability", question: "Is 195/65 R15 in stock?", answer: "Please share the exact size and I'll check the confirmed stock list.", keywords: ["stock", "available"], romanUrdu: ["stock hai", "mil jaye ga"] },
  { id: "f8", category: "Services", question: "Do you do wheel alignment?", answer: "Yes, wheel alignment is one of our regular services. Would you like to book an appointment?", keywords: ["alignment", "wheel alignment"], romanUrdu: ["alignment karte ho"] },
  { id: "f9", category: "Services", question: "Do you do wheel balancing?", answer: "Yes, wheel balancing is available. Bring your vehicle in or book a time.", keywords: ["balancing"], romanUrdu: ["balancing karte"] },
  { id: "f10", category: "Services", question: "Do you offer nitrogen air?", answer: "Yes, nitrogen air filling is available for all vehicles.", keywords: ["nitrogen"], romanUrdu: ["nitrogen milta"] },
  { id: "f11", category: "Services", question: "Do you do tyre fitting?", answer: "Yes, we fit and balance tyres on-site.", keywords: ["fitting", "mount"], romanUrdu: ["tyre lagana"] },
  { id: "f12", category: "Services", question: "Free air pressure check?", answer: "Yes, air pressure check and top-up is complimentary.", keywords: ["air pressure"], romanUrdu: ["hawa check"] },
  { id: "f13", category: "Services", question: "How long does alignment take?", answer: "Typical alignment takes around 30–45 minutes depending on the vehicle.", keywords: ["alignment time"], romanUrdu: ["alignment kitna time"] },
  { id: "f14", category: "Lubricants", question: "Do you sell engine oil?", answer: "Yes, we stock petrol and diesel engine oils. Please share your car model and year for the right specification.", keywords: ["engine oil", "oil"], romanUrdu: ["engine oil hai"] },
  { id: "f15", category: "Lubricants", question: "Do you have brake fluid?", answer: "Yes, DOT 4 brake fluid is available.", keywords: ["brake fluid"], romanUrdu: ["brake oil"] },
  { id: "f16", category: "Lubricants", question: "ATF for automatic cars?", answer: "Yes, multi-vehicle ATF is available. Please confirm specification from your owner's manual.", keywords: ["atf", "transmission"], romanUrdu: ["atf oil"] },
  { id: "f17", category: "Payments", question: "Which payment methods do you accept?", answer: "We accept cash and bank transfer. Card facility can be confirmed by the team.", keywords: ["payment", "card", "cash"], romanUrdu: ["payment kaise"] },
  { id: "f18", category: "Warranty", question: "Do tyres have warranty?", answer: "Warranty depends on brand and manufacturer terms. The team will confirm at purchase.", keywords: ["warranty", "guarantee"], romanUrdu: ["warranty hai"] },
  { id: "f19", category: "Appointments", question: "Do I need an appointment?", answer: "Walk-ins are welcome. Booking a time helps us keep your wait short.", keywords: ["appointment", "booking"], romanUrdu: ["appointment"] },
  { id: "f20", category: "Appointments", question: "Can I book online?", answer: "Yes — share your preferred date, time, and service and we'll request confirmation from the team.", keywords: ["book online"], romanUrdu: ["online booking"] },
  { id: "f21", category: "Tyres", question: "How do I find my tyre size?", answer: "The tyre size is written on the sidewall, e.g. 195/65 R15. You can type it here or send a clear sidewall photo.", keywords: ["tyre size", "find size"], romanUrdu: ["tyre size kahan"] },
  { id: "f22", category: "Tyres", question: "Which brand is best?", answer: "'Best' depends on your priority — comfort, fuel efficiency, highway, or budget. Share your driving priority and I'll suggest verified options.", keywords: ["best brand"], romanUrdu: ["konsa brand"] },
  { id: "f23", category: "Tyres", question: "Do you have used tyres?", answer: "We focus on new tyres. Please confirm with the team for any exceptions.", keywords: ["used tyres"], romanUrdu: ["purane tyre"] },
  { id: "f24", category: "Complaints", question: "I have a complaint", answer: "I'm sorry to hear that. Let me connect you to the Ghafoor Motors team right away.", keywords: ["complaint", "issue"], romanUrdu: ["shikayat"] },
  { id: "f25", category: "General", question: "Are you open on Sunday?", answer: "Sunday visits are usually by appointment. Please confirm with the team.", keywords: ["sunday"], romanUrdu: ["itwar khula"] },
  { id: "f26", category: "General", question: "Do you deliver tyres?", answer: "Delivery availability varies. Please share your area and the team will confirm.", keywords: ["delivery"], romanUrdu: ["delivery karte"] },
  { id: "f27", category: "General", question: "Are you a chatbot?", answer: "I'm Ghafoor Motors' automated assistant. I can help with common questions and connect you with our team whenever needed.", keywords: ["chatbot", "bot", "human?"], romanUrdu: ["insaan ho"] },
  { id: "f28", category: "Tyres", question: "Do you have run-flat tyres?", answer: "Run-flat availability varies by size. Please share your tyre size and I'll ask the team to confirm.", keywords: ["run flat"], romanUrdu: ["run flat"] },
  { id: "f29", category: "Services", question: "Do you fix punctures?", answer: "Puncture repair availability varies. Please confirm with the team on arrival.", keywords: ["puncture"], romanUrdu: ["puncture"] },
  { id: "f30", category: "General", question: "Contact number?", answer: "You can reach us on WhatsApp or phone at 0332-4443021.", keywords: ["contact", "phone", "number"], romanUrdu: ["number kya"] },
  { id: "f31", category: "Tyres", question: "SUV tyres?", answer: "Yes, we stock SUV tyres. Please share your SUV model and current tyre size.", keywords: ["suv tyre"], romanUrdu: ["suv ke tyre"] },
  { id: "f32", category: "Services", question: "Do you diagnose vibration?", answer: "Steering vibration can relate to balancing, tyres, or another mechanical issue. An inspection is recommended before confirming the required service.", keywords: ["vibration", "shaking"], romanUrdu: ["vibrate karti"] },
];

export function faqMatch(input: string): { faq?: FAQ; score: number } {
  const n = input.toLowerCase();
  let best = { faq: undefined as FAQ | undefined, score: 0 };
  for (const f of faqs) {
    const hay = [f.question, ...f.keywords, ...f.romanUrdu].map((s) => s.toLowerCase());
    for (const h of hay) {
      if (!h) continue;
      if (n === h) return { faq: f, score: 1 };
      if (n.includes(h) || h.includes(n)) {
        const s = Math.min(0.92, 0.55 + Math.min(h.length, n.length) / Math.max(h.length, n.length) * 0.4);
        if (s > best.score) best = { faq: f, score: s };
      }
    }
  }
  return best;
}
