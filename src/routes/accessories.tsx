import { createFileRoute } from "@tanstack/react-router";
import { CategoryLanding } from "@/components/CategoryLanding";

export const Route = createFileRoute("/accessories")({
  head: () => ({
    meta: [
      { title: "Car Accessories Karachi | Ghafoor Motors" },
      { name: "description", content: "Practical car accessories — floor mats, seat covers, mud flaps and more. WhatsApp us to check compatibility and price." },
    ],
  }),
  component: () => (
    <CategoryLanding
      category="accessories"
      eyebrow="Accessories"
      title="Practical Car Accessories"
      intro="Floor mats, seat covers, mud flaps and more — chosen for durability and fitment to popular Pakistani vehicles."
      waMessage="Assalam-o-Alaikum, please share accessories options for my car."
      chips={["Floor Mats","Seat Covers","Mud Flaps","Steering Cover","Body Cover"]}
    />
  ),
});
