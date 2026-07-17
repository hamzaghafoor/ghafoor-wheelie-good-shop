export type VehicleMake = { name: string; models: string[] };

export const vehicleMakes: VehicleMake[] = [
  { name: "Suzuki", models: ["Alto", "Cultus", "Swift", "WagonR"] },
  { name: "Toyota", models: ["Yaris", "Corolla", "Corolla Altis", "Fortuner"] },
  { name: "Honda", models: ["City", "Civic", "BR-V"] },
  { name: "Kia", models: ["Sportage", "Picanto", "Sorento"] },
  { name: "Hyundai", models: ["Tucson", "Elantra", "Sonata"] },
  { name: "MG", models: ["HS", "ZS EV"] },
];

export const popularVehicles = [
  "Suzuki Alto", "Suzuki Swift", "Toyota Yaris", "Toyota Corolla",
  "Honda City", "Honda Civic", "Kia Sportage", "Hyundai Tucson", "MG HS",
];

export const tyreWidths = ["165", "175", "185", "195", "205", "215", "225", "235", "245", "265"];
export const tyreProfiles = ["45", "50", "55", "60", "65", "70"];
export const tyreRims = ["14", "15", "16", "17", "18", "19"];
