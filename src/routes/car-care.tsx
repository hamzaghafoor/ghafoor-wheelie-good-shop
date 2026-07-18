import { createFileRoute } from "@tanstack/react-router";
import { CategoryLanding } from "@/components/CategoryLanding";

export const Route = createFileRoute("/car-care")({
  head: () => ({
    meta: [
      { title: "Car Care Products Karachi | Ghafoor Motors" },
      { name: "description", content: "Car shampoos, polishes, waxes, tyre shine and interior cleaners in Karachi. WhatsApp us for today's price and availability." },
    ],
  }),
  component: () => (
    <CategoryLanding
      category="car_care"
      eyebrow="Car Care"
      title="Keep Your Car Looking Its Best"
      intro="Shampoos, polishes, waxes, tyre shine and interior cleaners — chosen for Karachi conditions."
      waMessage="Assalam-o-Alaikum, please share options and prices for car care products."
      chips={["Shampoo","Polish","Wax","Tyre Shine","Interior Cleaner"]}
    />
  ),
});
