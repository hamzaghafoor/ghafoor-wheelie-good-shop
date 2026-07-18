// Common metric tyre size options. Staff can enter custom values as well.
export const COMMON_WIDTHS = [155,165,175,185,195,205,215,225,235,245,255,265,275,285,295,305];
export const COMMON_PROFILES = [30,35,40,45,50,55,60,65,70,75,80];
export const COMMON_RIMS = [13,14,15,16,17,18,19,20,21,22];

export const VEHICLE_CATEGORIES = [
  "Hatchback","Sedan","Passenger Car","SUV/Crossover","4x4","Light Commercial","Commercial","Other",
];

export const DRIVING_CHARACTERISTICS = [
  "Comfortable Daily Driving","Low Road Noise","Wet-Road Grip","Highway Stability",
  "Longer Tread Life","Fuel-Efficiency Focus","Performance","All-Terrain","Budget-Friendly",
];

export const PRICE_MODES: { value: string; label: string }[] = [
  { value: "fixed", label: "Show Fixed Price" },
  { value: "confirm_today", label: "Confirm Today's Price" },
  { value: "on_request", label: "Price on Request" },
  { value: "starting_from", label: "Starting From" },
  { value: "hidden", label: "Hide Price" },
];

export const AVAILABILITY_STATUSES: { value: string; label: string }[] = [
  { value: "in_stock", label: "In Stock" },
  { value: "limited", label: "Limited Availability" },
  { value: "check", label: "Check Availability" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "on_order", label: "On Order" },
  { value: "discontinued", label: "Discontinued" },
];
