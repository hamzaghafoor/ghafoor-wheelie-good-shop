import { waLink } from "./business";

export type WATyreCtx = {
  brand?: string;
  model?: string;
  size?: string;
  vehicle?: { make?: string; model?: string; year?: string | number };
  url?: string;
  extra?: string;
};

export function buildTyreMessage(c: WATyreCtx): string {
  const parts: string[] = ["Assalam-o-Alaikum,"];
  if (c.brand || c.model) {
    parts.push(`I'm interested in ${[c.brand, c.model].filter(Boolean).join(" ")}${c.size ? `, size ${c.size}` : ""}.`);
  } else if (c.size) {
    parts.push(`I'm looking for tyres in size ${c.size}.`);
  } else if (c.vehicle && (c.vehicle.make || c.vehicle.model)) {
    const v = [c.vehicle.make, c.vehicle.model, c.vehicle.year].filter(Boolean).join(" ");
    parts.push(`I need tyres for my ${v}.`);
  } else {
    parts.push("I'd like help choosing the right tyres.");
  }
  if (c.vehicle && (c.brand || c.model)) {
    const v = [c.vehicle.make, c.vehicle.model, c.vehicle.year].filter(Boolean).join(" ");
    if (v) parts.push(`Vehicle: ${v}.`);
  }
  parts.push("Please confirm today's price and availability.");
  if (c.extra) parts.push(c.extra);
  if (c.url) parts.push(`(${c.url})`);
  return parts.join(" ");
}

export function waTyreLink(c: WATyreCtx): string {
  return waLink(buildTyreMessage(c));
}
