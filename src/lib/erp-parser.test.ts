// Unit tests for the ERP parser. Run with `bun test src/lib/erp-parser.test.ts`.
// These tests lock in the two P2-D1 grouping cases so a regex regression can't ship again.
// @ts-expect-error - bun:test is provided by the Bun runtime, not typed for tsc.
import { describe, it, expect } from "bun:test";
import { coreName, parsePack, parseSheet, extractViscosity } from "./erp-parser";

describe("coreName — pack tokens are stripped so same family groups regardless of size", () => {
  const brand = "Acme";
  const a = coreName("Super Light 4 L", brand);
  const b = coreName("Super Light 1 L", brand);
  const c = coreName("Super Light 0.7 L", brand);

  it("Super Light in 4L / 1L / 0.7L collapse to identical family cores", () => {
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toBe("super light");
  });

  it("also handles ml/kg/pcs tokens and case variations", () => {
    expect(coreName("Super Light 500 ML", brand)).toBe("super light");
    expect(coreName("Super Light 20KG", brand)).toBe("super light");
    expect(coreName("Super Light 6 pcs", brand)).toBe("super light");
  });
});

describe("coreName — different products remain in different families", () => {
  it("Helix Ultra 5W-30 and Rimula R4 X 5W-30 must not collapse", () => {
    const shell = coreName("Helix Ultra 5W-30 4 L", "Shell");
    const rimula = coreName("Rimula R4 X 5W-30 4 L", "Shell");
    expect(shell).not.toBe(rimula);
    // brand + viscosity stripped, differing core survives
    expect(shell).toContain("helix ultra");
    expect(rimula).toContain("rimula r4 x");
  });
});

describe("family key composition", () => {
  const key = (desc: string, brand: string) => {
    const c = coreName(desc, brand);
    const v = extractViscosity(desc) ?? "";
    return [brand.toLowerCase(), v, c].join("|");
  };
  it("Super Light 4L / 1L / 0.7L share one key", () => {
    const k1 = key("Super Light 4 L", "Acme");
    const k2 = key("Super Light 1 L", "Acme");
    const k3 = key("Super Light 0.7 L", "Acme");
    expect(k1).toBe(k2);
    expect(k2).toBe(k3);
  });
  it("Helix Ultra vs Rimula R4 X keys differ", () => {
    expect(key("Helix Ultra 5W-30 4 L", "Shell")).not.toBe(key("Rimula R4 X 5W-30 4 L", "Shell"));
  });
});

describe("parsePack — viscosity-safe", () => {
  it("5W-30 4L → pack is 4 L, not 5 or 30 L", () => {
    const r = parsePack("Helix Ultra 5W-30 4 L");
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value).toBe(4); expect(r.unit).toBe("L"); }
  });
  it("500ml canister", () => {
    const r = parsePack("Brake Cleaner 500 ml");
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value).toBe(500); expect(r.unit).toBe("ml"); }
  });
  it("returns not-ok when no pack token present", () => {
    const r = parsePack("Oil filter for W204");
    expect(r.ok).toBe(false);
  });
});

describe("parseSheet — CSV formula neutralization + header/brand detection", () => {
  it("detects header + brand candidate above header row", () => {
    const rows = [
      ["ADDINOL"], [""],
      ["Stock ID", "Description", "UOM", "Qty"],
      ["A1", "Super Light 5W-30 4 L", "L", "10"],
      ["A2", "Super Light 5W-30 1 L", "L", "20"],
    ];
    const p = parseSheet({ name: "s", rows });
    expect(p.header).not.toBeNull();
    expect(p.brandCandidates.length).toBeGreaterThan(0);
    expect(p.brandCandidates[0].normalized).toBe("addinol");
    expect(p.productRows.length).toBe(2);
    // both share one family key
    expect(p.productRows[0].familyKey).toBe(p.productRows[1].familyKey);
  });
});
