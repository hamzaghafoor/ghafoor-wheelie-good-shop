import { createFileRoute } from "@tanstack/react-router";
import { CategoryLanding } from "@/components/CategoryLanding";

export const Route = createFileRoute("/lubricants")({
  head: () => ({
    meta: [
      { title: "Engine Oil & Lubricants Karachi | Ghafoor Motors" },
      { name: "description", content: "Quality engine oils, transmission fluids, coolants and brake fluids for cars and SUVs in Karachi. Ask on WhatsApp for today's price and availability." },
    ],
  }),
  component: () => (
    <CategoryLanding
      category="lubricants"
      eyebrow="Lubricants"
      title="Engine Oils & Automotive Lubricants"
      intro="Petrol and diesel engine oils, transmission fluids, coolants and brake fluids — matched to your vehicle and driving conditions."
      waMessage="Assalam-o-Alaikum, please suggest a suitable engine oil for my car and share today's price."
      chips={["Petrol Engine Oil","Diesel Engine Oil","Transmission Fluid","Coolant","Brake Fluid"]}
    />
  ),
});
