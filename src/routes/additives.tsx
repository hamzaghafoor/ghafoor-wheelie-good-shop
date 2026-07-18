import { createFileRoute } from "@tanstack/react-router";
import { CategoryLanding } from "@/components/CategoryLanding";

export const Route = createFileRoute("/additives")({
  head: () => ({
    meta: [
      { title: "Fuel & Engine Additives Karachi | Ghafoor Motors" },
      { name: "description", content: "Fuel system cleaners, engine flushes, oil additives and coolant treatments. WhatsApp us for today's price and expert advice." },
    ],
  }),
  component: () => (
    <CategoryLanding
      category="additives"
      eyebrow="Additives"
      title="Fuel & Engine Additives"
      intro="Fuel system cleaners, engine flushes and oil additives — used correctly, they help maintain performance."
      waMessage="Assalam-o-Alaikum, please suggest a suitable additive for my car."
      chips={["Fuel System Cleaner","Engine Flush","Oil Additive","Coolant Treatment"]}
    />
  ),
});
