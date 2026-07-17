// DEMO tyre catalogue — replace with real inventory once supplied.
import tyrePassenger from "@/assets/tyre-passenger.jpg";
import tyreSuv from "@/assets/tyre-suv.jpg";
import tyrePerf from "@/assets/tyre-performance.jpg";
import tyreHatch from "@/assets/tyre-hatch.jpg";

export type TyreCategory = "Passenger" | "SUV" | "Hatchback" | "Commercial";
export type TyrePriority = "Comfort" | "Fuel Efficiency" | "Highway" | "Value" | "All-Terrain";

export type Tyre = {
  id: string;
  brand: string;
  model: string;
  sizes: string[];
  category: TyreCategory;
  priorities: TyrePriority[];
  features: string[];
  vehicles: string[];
  image: string;
  inStock: boolean;
  demo?: boolean;
};

export const tyres: Tyre[] = [
  {
    id: "t1",
    brand: "Sample Brand A",
    model: "CityCruise",
    sizes: ["185/65 R15", "195/65 R15"],
    category: "Hatchback",
    priorities: ["Fuel Efficiency", "Comfort"],
    features: ["Comfortable daily driving", "Low road noise", "Fuel-friendly compound"],
    vehicles: ["Suzuki Alto", "Suzuki Swift", "Toyota Yaris"],
    image: tyreHatch,
    inStock: true,
    demo: true,
  },
  {
    id: "t2",
    brand: "Sample Brand A",
    model: "SedanTouring HP",
    sizes: ["195/65 R15", "205/55 R16"],
    category: "Passenger",
    priorities: ["Comfort", "Highway"],
    features: ["Highway stability", "Balanced wet grip", "Low road noise"],
    vehicles: ["Toyota Corolla", "Honda City", "Honda Civic"],
    image: tyrePassenger,
    inStock: true,
    demo: true,
  },
  {
    id: "t3",
    brand: "Sample Brand B",
    model: "GripSport",
    sizes: ["205/55 R16", "215/45 R17"],
    category: "Passenger",
    priorities: ["Highway", "Comfort"],
    features: ["Sharp steering response", "Wet-road grip", "Durable tread"],
    vehicles: ["Honda Civic", "Toyota Corolla Altis"],
    image: tyrePerf,
    inStock: true,
    demo: true,
  },
  {
    id: "t4",
    brand: "Sample Brand C",
    model: "TerraPath HT",
    sizes: ["225/65 R17", "235/60 R18"],
    category: "SUV",
    priorities: ["Highway", "Comfort"],
    features: ["Comfortable SUV ride", "Highway stability", "Even wear pattern"],
    vehicles: ["Kia Sportage", "Hyundai Tucson", "MG HS"],
    image: tyreSuv,
    inStock: true,
    demo: true,
  },
  {
    id: "t5",
    brand: "Sample Brand C",
    model: "TerraPath AT",
    sizes: ["235/65 R17", "265/60 R18"],
    category: "SUV",
    priorities: ["All-Terrain"],
    features: ["Rugged block tread", "Confident on rough roads", "Highway capable"],
    vehicles: ["Toyota Fortuner", "Kia Sportage AWD"],
    image: tyreSuv,
    inStock: true,
    demo: true,
  },
  {
    id: "t6",
    brand: "Sample Brand D",
    model: "EcoMile",
    sizes: ["165/65 R14", "175/65 R14"],
    category: "Hatchback",
    priorities: ["Fuel Efficiency", "Value"],
    features: ["Value-focused option", "Low rolling resistance", "Everyday reliability"],
    vehicles: ["Suzuki Alto", "Suzuki Cultus"],
    image: tyreHatch,
    inStock: false,
    demo: true,
  },
  {
    id: "t7",
    brand: "Sample Brand B",
    model: "ComfortDrive",
    sizes: ["195/60 R15", "205/60 R16"],
    category: "Passenger",
    priorities: ["Comfort", "Fuel Efficiency"],
    features: ["Quiet cabin experience", "Balanced comfort", "Reliable wet grip"],
    vehicles: ["Toyota Yaris", "Honda City"],
    image: tyrePassenger,
    inStock: true,
    demo: true,
  },
  {
    id: "t8",
    brand: "Sample Brand E",
    model: "HighwayPro",
    sizes: ["215/55 R17", "225/50 R17"],
    category: "Passenger",
    priorities: ["Highway", "Value"],
    features: ["Highway durability", "Consistent handling", "Long tread life"],
    vehicles: ["Honda Civic", "Toyota Corolla Grande"],
    image: tyrePerf,
    inStock: true,
    demo: true,
  },
];

export const tyreBrands = Array.from(new Set(tyres.map((t) => t.brand)));
export const tyreSizes = Array.from(new Set(tyres.flatMap((t) => t.sizes)));
export const tyreCategories: TyreCategory[] = ["Hatchback", "Passenger", "SUV", "Commercial"];
export const tyrePriorities: TyrePriority[] = ["Comfort", "Fuel Efficiency", "Highway", "Value", "All-Terrain"];
