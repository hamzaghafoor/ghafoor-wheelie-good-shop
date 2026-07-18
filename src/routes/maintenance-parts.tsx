import { createFileRoute } from "@tanstack/react-router";
import { CategoryLanding } from "@/components/CategoryLanding";

export const Route = createFileRoute("/maintenance-parts")({
  head: () => ({
    meta: [
      { title: "Car Maintenance Parts Karachi | Ghafoor Motors" },
      { name: "description", content: "Everyday maintenance parts for your car — brake pads, wipers, spark plugs, belts and more. Ask on WhatsApp for suitable options and today's price." },
    ],
  }),
  component: () => (
    <CategoryLanding
      category="maintenance_parts"
      eyebrow="Maintenance"
      title="Everyday Car Maintenance Parts"
      intro="Brake pads, wipers, spark plugs, drive belts and other wear parts — matched to your vehicle."
      waMessage="Assalam-o-Alaikum, I need maintenance parts for my car. Please suggest suitable options."
      chips={["Brake Pads","Wipers","Spark Plugs","Belts","Bulbs"]}
    />
  ),
});
