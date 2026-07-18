import { createFileRoute } from "@tanstack/react-router";
import { CategoryLanding } from "@/components/CategoryLanding";

export const Route = createFileRoute("/filters")({
  head: () => ({
    meta: [
      { title: "Car Filters Karachi | Oil, Air, Cabin & Fuel Filters | Ghafoor Motors" },
      { name: "description", content: "Genuine and quality oil filters, air filters, AC/cabin filters, fuel filters and transmission filters for cars and SUVs in Karachi." },
    ],
  }),
  component: () => (
    <CategoryLanding
      category="filters"
      eyebrow="Filters"
      title="Oil, Air, Cabin, Fuel & Transmission Filters"
      intro="Keep your engine, cabin air and fuel system clean. We stock filters for popular Pakistani vehicles."
      waMessage="Assalam-o-Alaikum, I need filters for my car. Please share options and today's price."
      chips={["Oil Filter","Air Filter","AC / Cabin Filter","Fuel Filter","Transmission Filter"]}
    />
  ),
});
