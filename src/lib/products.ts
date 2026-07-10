import tyreSport from "@/assets/p-tyre-sport.jpg";
import tyreSuv from "@/assets/p-tyre-suv.jpg";
import tyreTouring from "@/assets/p-tyre-touring.jpg";
import oilSynth from "@/assets/p-oil-synth.jpg";
import oilDiesel from "@/assets/p-oil-diesel.jpg";
import brake from "@/assets/p-brake.jpg";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: "Tyres" | "Lubricants";
  subcategory: string;
  price: number;
  size?: string;
  image: string;
  badge?: string;
  description: string;
};

export const products: Product[] = [
  {
    id: "tyre-sport-225",
    name: "TrackGrip Sport RS",
    brand: "Michelin",
    category: "Tyres",
    subcategory: "Performance",
    price: 24500,
    size: "225/45 R17",
    image: tyreSport,
    badge: "Bestseller",
    description:
      "High-performance summer tyre engineered for dry grip and precise cornering on hot roads.",
  },
  {
    id: "tyre-suv-265",
    name: "TerraForce AT",
    brand: "Bridgestone",
    category: "Tyres",
    subcategory: "SUV / 4x4",
    price: 32900,
    size: "265/65 R17",
    image: tyreSuv,
    description:
      "All-terrain SUV tyre with aggressive block tread for rock, gravel and highway use.",
  },
  {
    id: "tyre-touring-195",
    name: "SilentCruise HP",
    brand: "Continental",
    category: "Tyres",
    subcategory: "Touring",
    price: 18900,
    size: "195/65 R15",
    image: tyreTouring,
    description:
      "Quiet touring tyre with low rolling resistance for daily sedans and long highway runs.",
  },
  {
    id: "oil-synth-5w40",
    name: "Full Synthetic 5W-40",
    brand: "Shell Helix Ultra",
    category: "Lubricants",
    subcategory: "Engine Oil",
    price: 8500,
    size: "4L",
    image: oilSynth,
    badge: "New",
    description:
      "PurePlus fully synthetic engine oil for petrol engines. Superior sludge protection and cold-start flow.",
  },
  {
    id: "oil-diesel-15w40",
    name: "Rimula Diesel 15W-40",
    brand: "Shell",
    category: "Lubricants",
    subcategory: "Diesel Oil",
    price: 6900,
    size: "5L",
    image: oilDiesel,
    description:
      "Heavy-duty mineral diesel engine oil for trucks, pickups and commercial fleets.",
  },
  {
    id: "brake-dot4",
    name: "Brake Fluid DOT 4",
    brand: "Bosch",
    category: "Lubricants",
    subcategory: "Brake Fluid",
    price: 1450,
    size: "500ml",
    image: brake,
    description:
      "High-temperature DOT 4 brake fluid with a dry boiling point of 260°C for reliable pedal feel.",
  },
];

export const formatPKR = (n: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);

export const getProduct = (id: string) => products.find((p) => p.id === id);
