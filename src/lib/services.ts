import svcAlignment from "@/assets/svc-alignment.jpg";
import svcBalancing from "@/assets/svc-balancing.jpg";
import svcNitrogen from "@/assets/svc-nitrogen.jpg";

export type Service = {
  id: string;
  name: string;
  short: string;
  description: string;
  signs: string[];
  image: string;
};

export const services: Service[] = [
  {
    id: "alignment",
    name: "Wheel Alignment",
    short: "Improve steering control and reduce uneven tyre wear.",
    description:
      "Correct wheel angles can help improve steering control and prevent uneven tyre wear.",
    signs: ["Car pulling to one side", "Uneven tyre wear", "Off-centre steering wheel"],
    image: svcAlignment,
  },
  {
    id: "balancing",
    name: "Wheel Balancing",
    short: "Reduce steering vibration and improve ride comfort.",
    description:
      "Balanced wheels help reduce vibration at highway speeds and support smoother, more comfortable driving.",
    signs: ["Steering wheel vibration", "Uneven tread wear", "Ride feels unsettled at speed"],
    image: svcBalancing,
  },
  {
    id: "nitrogen",
    name: "Nitrogen Air Filling",
    short: "Consistent tyre pressure with dry nitrogen inflation.",
    description:
      "Nitrogen inflation is a low-moisture alternative to compressed air, helping tyres hold pressure more steadily over time.",
    signs: ["Frequent pressure top-ups", "Long highway trips ahead", "New tyre fitment"],
    image: svcNitrogen,
  },
  {
    id: "fitting",
    name: "Tyre Fitting",
    short: "Professional mounting and safe fitment.",
    description:
      "Careful mounting, valve replacement where needed, and torque-checked fitting for your new tyres.",
    signs: ["Buying new tyres", "Replacing a damaged tyre", "Seasonal tyre change"],
    image: svcBalancing,
  },
  {
    id: "inspection",
    name: "Tyre Inspection",
    short: "Check tread depth, sidewall condition and pressure.",
    description:
      "A quick visual check of your tyres — tread depth, sidewall damage, and inflation — before a long trip or service.",
    signs: ["Before long journeys", "After curb impact", "Older tyres in use"],
    image: svcAlignment,
  },
  {
    id: "pressure",
    name: "Air Pressure Check",
    short: "Set correct pressure for your vehicle's specification.",
    description:
      "Free tyre pressure check and top-up to the correct pressure for your vehicle.",
    signs: ["Tyres look soft", "Fuel economy dropping", "Long-distance drive coming up"],
    image: svcNitrogen,
  },
];
