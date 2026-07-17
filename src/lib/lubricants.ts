// DEMO lubricants — replace with real inventory once supplied.
import lubeEngine from "@/assets/lube-engine.jpg";
import lubeAtf from "@/assets/lube-atf.jpg";
import lubeCoolant from "@/assets/lube-coolant.jpg";
import lubeBrake from "@/assets/lube-brake.jpg";

export type LubeCategory =
  | "Petrol Engine Oil"
  | "Diesel Engine Oil"
  | "Transmission Fluid"
  | "Coolant"
  | "Brake Fluid"
  | "Other";

export type Lubricant = {
  id: string;
  brand: string;
  name: string;
  spec: string;
  packSize: string;
  category: LubeCategory;
  vehicleType: string;
  image: string;
  inStock: boolean;
  demo?: boolean;
};

export const lubricants: Lubricant[] = [
  { id: "l1", brand: "Sample Brand", name: "Fully Synthetic 5W-40", spec: "API SN, ACEA A3/B4", packSize: "4L", category: "Petrol Engine Oil", vehicleType: "Modern petrol cars", image: lubeEngine, inStock: true, demo: true },
  { id: "l2", brand: "Sample Brand", name: "Semi-Synthetic 10W-40", spec: "API SN", packSize: "4L", category: "Petrol Engine Oil", vehicleType: "Everyday sedans & hatchbacks", image: lubeEngine, inStock: true, demo: true },
  { id: "l3", brand: "Sample Brand", name: "Heavy Duty Diesel 15W-40", spec: "API CI-4/SL", packSize: "5L", category: "Diesel Engine Oil", vehicleType: "Diesel SUVs, pickups, fleets", image: lubeEngine, inStock: true, demo: true },
  { id: "l4", brand: "Sample Brand", name: "ATF Multi-Vehicle", spec: "Dexron VI compatible", packSize: "1L", category: "Transmission Fluid", vehicleType: "Automatic transmissions", image: lubeAtf, inStock: true, demo: true },
  { id: "l5", brand: "Sample Brand", name: "Long-Life Coolant", spec: "Pre-mixed 50/50", packSize: "1L", category: "Coolant", vehicleType: "Petrol & diesel radiators", image: lubeCoolant, inStock: true, demo: true },
  { id: "l6", brand: "Sample Brand", name: "Brake Fluid DOT 4", spec: "FMVSS 116 DOT 4", packSize: "500ml", category: "Brake Fluid", vehicleType: "Most modern vehicles", image: lubeBrake, inStock: true, demo: true },
];

export const lubeCategories: LubeCategory[] = [
  "Petrol Engine Oil", "Diesel Engine Oil", "Transmission Fluid", "Coolant", "Brake Fluid", "Other",
];
