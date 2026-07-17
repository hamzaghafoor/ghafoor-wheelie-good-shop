import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/business";

export function WhatsAppButton() {
  return (
    <a
      href={waLink("Assalam-o-Alaikum, I found Ghafoor Motors through your website and need help with tyres/services for my vehicle.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Ask on WhatsApp"
      className="fixed bottom-24 right-4 z-40 hidden items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 md:bottom-6 md:inline-flex"
    >
      <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
    </a>
  );
}
