// Universal ERP catalogue parser — pure, unit-testable module.
// Reads spreadsheet cell VALUES only. Never evaluates formulas.
// Supports .xlsx/.xls via SheetJS (server-side) and .csv via the built-in parser.

export const STOCK_ID_ALIASES = [
  "stockid", "stockcode", "itemcode", "productcode", "sku", "code",
];
export const DESCRIPTION_ALIASES = [
  "description", "itemdescription", "productdescription", "productname", "itemname",
];
// Columns we deliberately ignore (never imported).
export const IGNORED_ALIASES = [
  "uom", "quantity", "qty", "demand", "available", "onorder", "onhand", "balance",
  "reserved", "price", "cost", "purchase",
];

// Textual unit tokens → canonical packaging_units.code
const UNIT_MAP: Record<string, string> = {
  L: "L", LTR: "L", LTRS: "L", LITRE: "L", LITRES: "L", LITER: "L", LITERS: "L",
  ML: "ml",
  G: "g", GM: "g", GRAM: "g", GRAMS: "g", GRAMME: "g", GRAMMES: "g",
  KG: "kg", KGS: "kg", KILO: "kg", KILOS: "kg",
  PCS: "pcs", PC: "pcs", PIECE: "pcs", PIECES: "pcs",
  PACK: "pack", PACKS: "pack",
  BOTTLE: "pcs", BOTTLES: "pcs", CAN: "pcs", CANS: "pcs", TUBE: "pcs", TUBES: "pcs",
  SET: "set", SETS: "set",
};
const UNIT_TOKENS = Object.keys(UNIT_MAP).sort((a, b) => b.length - a.length);
const UNIT_TOKEN_RE = new RegExp(`\\b(${UNIT_TOKENS.join("|")})\\b`, "i");

// Viscosity patterns to strip before pack detection, so "5W-30" never becomes "5 L" or "30 L".
const VISCOSITY_RES = [
  /\b\d{1,3}W[-\s]?\d{1,3}\b/gi,     // 5W-30, 10W40, 20W50
  /\b\d{1,3}W\b/gi,                   // 0W, 5W (rare, seasonal)
];

// Cell/spreadsheet safety limits.
export const LIMITS = {
  maxFileBytes: 10_000_000, // raised so Digitley PDFs (~2-8 MB) fit
  maxSheets: 10,
  maxRows: 5_000,
  maxCellChars: 500,
} as const;

export type SheetTable = { name: string; rows: string[][] };

// --------- Category & tyre detection ---------
// Tyre size: 205/55R16, 265/70R17, 33x12.5R15, 195/60 R 15, LT265/70R17
const TYRE_SIZE_RE = /\b(?:LT)?\d{3}\/\d{2}\s*R\s*\d{2}\b/i;
const FLIP_TYRE_RE = /\b\d{2}(?:\.\d)?x\d{1,2}(?:\.\d)?\s*R\s*\d{2}\b/i;

export function detectTyreSize(desc: string): string | null {
  const m = desc.match(TYRE_SIZE_RE) ?? desc.match(FLIP_TYRE_RE);
  return m ? m[0].replace(/\s+/g, "").toUpperCase() : null;
}

/**
 * Suggest a product_category enum literal from description + UOM.
 * Returns null when the row is ambiguous — admin still confirms in review.
 */
export function suggestCategory(desc: string, uom?: string | null):
  | "tyres" | "lubricants" | "filters" | "additives" | "car_care" | "accessories" | "maintenance_parts" | null
{
  const d = (desc || "").toLowerCase();
  const u = (uom || "").toLowerCase();
  if (detectTyreSize(desc)) return "tyres";
  if (/\btyre|tire|tubeless|run\s*flat\b/.test(d)) return "tyres";
  if (/\bad\s*blue\b/.test(d)) return "additives";
  if (/\b(oil|lubric|atf|gear\s*oil|coolant|antifreeze|brake\s*fluid|hydraulic)\b/.test(d)) return "lubricants";
  if (/\b(filter|element)\b/.test(d)) return "filters";
  if (/\b(cleaner|polish|wax|shampoo|degreaser|car\s*care)\b/.test(d)) return "car_care";
  if (/\b(additive|booster|treatment|flush)\b/.test(d)) return "additives";
  // Falls back on UOM when description gives no hint
  if (u === "ltr" || u === "l" || u === "ml") return "lubricants";
  return null;
}


// --------- Sanitization ---------
export function sanitizeCell(v: unknown): string {
  if (v == null) return "";
  let s = typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : "";
  // strip control chars except tab/newline
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  // Neutralize formula prefixes so nothing ever renders as an active formula in a downstream sheet.
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
  if (s.length > LIMITS.maxCellChars) s = s.slice(0, LIMITS.maxCellChars);
  return s;
}

const normHeader = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "");

// --------- CSV parser (RFC-4180-ish, no formula execution) ---------
export function parseCSV(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows.map(r => r.map(sanitizeCell));
}

// --------- Header detection ---------
export type HeaderDetect = {
  headerRow: number;              // 0-based index into rows[]
  stockCol: number;
  descCol: number;
  ignoredCols: number[];
  columnNames: string[];
  warnings: string[];
};

export function detectHeader(rows: string[][]): HeaderDetect | null {
  const scanUpTo = Math.min(rows.length, 40);
  for (let r = 0; r < scanUpTo; r++) {
    const cells = rows[r];
    if (!cells || cells.every(c => !c || c.trim() === "")) continue;
    let stockCol = -1, descCol = -1;
    const ignored: number[] = [];
    for (let c = 0; c < cells.length; c++) {
      const norm = normHeader(cells[c] ?? "");
      if (!norm) continue;
      if (stockCol < 0 && STOCK_ID_ALIASES.includes(norm)) stockCol = c;
      if (descCol < 0 && DESCRIPTION_ALIASES.includes(norm)) descCol = c;
      if (IGNORED_ALIASES.includes(norm)) ignored.push(c);
    }
    if (stockCol >= 0 && descCol >= 0) {
      return {
        headerRow: r,
        stockCol,
        descCol,
        ignoredCols: ignored,
        columnNames: cells.map(x => x ?? ""),
        warnings: [],
      };
    }
  }
  return null;
}

// --------- Brand candidate detection ---------
export type BrandCandidate = { text: string; normalized: string; sourceRow: number; confidence: "high" | "medium" | "low" };

// Return every plausible brand heading found ABOVE the header row.
// Never automatically trusts the first non-empty cell.
export function detectBrandCandidates(rows: string[][], headerRow: number): BrandCandidate[] {
  const out: BrandCandidate[] = [];
  const seen = new Set<string>();
  for (let r = 0; r < headerRow; r++) {
    const cells = rows[r] ?? [];
    for (const raw of cells) {
      const cell = (raw ?? "").trim();
      if (!cell || cell.length < 2 || cell.length > 60) continue;
      // ignore rows that look like reports/dates
      if (/^\d{1,4}[/\-.]\d{1,4}[/\-.]\d{1,4}$/.test(cell)) continue;
      if (/^(report|generated|printed|stock|inventory|as of)\b/i.test(cell)) continue;
      // Strip parenthesized suffixes, e.g. "ADDINOL (GSA 2)" -> "ADDINOL"
      const trimmed = cell.replace(/\s*[\(\[].*?[\)\]]\s*$/, "").trim();
      const norm = trimmed.toLowerCase().replace(/\s+/g, "");
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      out.push({
        text: cell,
        normalized: norm,
        sourceRow: r,
        confidence: /^[A-Z][A-Z0-9 \-&.]{1,}$/.test(cell) ? "high" : "medium",
      });
    }
  }
  return out;
}

// --------- Pack size parser ---------
export type PackParseResult =
  | { ok: true; value: number; unit: string; sourceToken: string }
  | { ok: false; reason: string };

export function parsePack(descIn: string): PackParseResult {
  let s = descIn;
  for (const re of VISCOSITY_RES) s = s.replace(re, " ");
  // Also strip explicit "specification" chunks like "API SN", "ACEA C3", "ILSAC GF-5"
  s = s.replace(/\b(API|ACEA|ILSAC|JASO|SAE|ISO|DIN)[- ]?[A-Z0-9\-/+]+/gi, " ");

  const re = /(?<![\w.])(\d+(?:[.,]\d+)?)\s*(L|LTR|LTRS|LITRE|LITRES|LITER|LITERS|ML|G|GM|GRAM|GRAMS|GRAMME|GRAMMES|KG|KGS|KILO|KILOS|PCS|PC|PIECE|PIECES|PACK|PACKS|BOTTLE|BOTTLES|CAN|CANS|TUBE|TUBES|SET|SETS)(?![A-Za-z0-9])/gi;
  const matches: { value: number; unit: string; token: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const raw = m[1].replace(",", ".");
    const val = parseFloat(raw);
    if (!isFinite(val) || val <= 0) continue;
    const unitTok = m[2].toUpperCase();
    const unit = UNIT_MAP[unitTok];
    if (!unit) continue;
    matches.push({ value: val, unit, token: m[0], index: m.index });
  }
  if (matches.length === 0) return { ok: false, reason: "no pack token found" };
  // Prefer the last match (pack info usually trails the product name).
  const last = matches[matches.length - 1];
  return { ok: true, value: last.value, unit: last.unit, sourceToken: last.token.trim() };
}

// --------- Family core name ---------
// Strip brand + pack token + viscosity/spec noise so grouping keys are stable.
export function coreName(desc: string, brand?: string | null): string {
  let s = desc;
  if (brand) {
    const re = new RegExp("\\b" + brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "ig");
    s = s.replace(re, " ");
  }
  for (const re of VISCOSITY_RES) s = s.replace(re, " ");
  // Strip "<number> <unit>" tokens (e.g. "4 L", "500 ml"). Uses UNIT_TOKENS directly so the
  // regex remains valid — an earlier bug used UNIT_TOKEN_RE.source.slice(1,-1) which stripped
  // required backslashes and produced a broken pattern that never matched, causing pack size
  // to leak into the family key (e.g. "Super Light 4 L" and "Super Light 1 L" grouped separately).
  s = s.replace(new RegExp(`\\b\\d+(?:[.,]\\d+)?\\s*(?:${UNIT_TOKENS.join("|")})\\b`, "gi"), " ");
  s = s.replace(/\s+/g, " ").trim().toLowerCase();
  s = s.replace(/[^a-z0-9\s\-]/g, "").trim();
  return s;
}

// --------- Viscosity extraction ---------
export function extractViscosity(desc: string): string | null {
  const m = desc.match(/\b(\d{1,3}W[-\s]?\d{1,3})\b/i);
  return m ? m[1].toUpperCase().replace(/\s+/g, "").replace(/([0-9])W([0-9])/, "$1W-$2") : null;
}

// --------- Row parse ---------
export type ParsedRow = {
  rowNumber: number;               // 1-based excel row (header + offset)
  erpStockId: string;
  erpDescription: string;
  brandHint: string | null;
  familyKey: string | null;
  suggestedFamilyName: string;
  viscosity: string | null;
  pack: PackParseResult;
  isPlaceholder: boolean;
  isBlank: boolean;
  warnings: string[];
};

const PLACEHOLDER_TOKENS = new Set(["xyz", "sample", "test", "demo", "n/a", "na", "-", "---"]);

export function parseRow(
  rows: string[][],
  header: HeaderDetect,
  brandHint: string | null,
  rowIndex: number,   // 0-based into rows[]
): ParsedRow | null {
  const cells = rows[rowIndex];
  if (!cells) return null;
  const stock = (cells[header.stockCol] ?? "").trim();
  const desc = (cells[header.descCol] ?? "").trim();
  const rowNumber = rowIndex + 1;

  if (!stock && !desc) {
    return { rowNumber, erpStockId: "", erpDescription: "", brandHint, familyKey: null,
      suggestedFamilyName: "", viscosity: null,
      pack: { ok: false, reason: "blank row" },
      isPlaceholder: false, isBlank: true, warnings: [] };
  }

  const warnings: string[] = [];
  const isPlaceholder =
    !desc || PLACEHOLDER_TOKENS.has(desc.toLowerCase()) ||
    PLACEHOLDER_TOKENS.has(stock.toLowerCase());

  const viscosity = extractViscosity(desc);
  const pack = parsePack(desc);
  if (!pack.ok) warnings.push("Pack size could not be detected — mark as No pack required or fill it in.");

  const core = coreName(desc, brandHint);
  // Family key: brand + viscosity + core name (all lowercased)
  const familyKey =
    core
      ? [brandHint?.toLowerCase().trim() || "?", viscosity ?? "", core].filter(Boolean).join("|")
      : null;

  const suggestedFamilyName = viscosity
    ? [brandHint, core.replace(/\b(engine|motor)\s*oil\b/i, "").trim(), viscosity].filter(Boolean).join(" ").trim()
    : [brandHint, core].filter(Boolean).join(" ").trim();

  return {
    rowNumber,
    erpStockId: stock,
    erpDescription: desc,
    brandHint,
    familyKey,
    suggestedFamilyName: suggestedFamilyName || desc,
    viscosity,
    pack,
    isPlaceholder,
    isBlank: false,
    warnings,
  };
}

// --------- Full sheet parse ---------
export type SheetParse = {
  header: HeaderDetect | null;
  brandCandidates: BrandCandidate[];
  productRows: ParsedRow[];
  blankRows: number;
  totalRows: number;
  warnings: string[];
};

export function parseSheet(table: SheetTable, brandHintOverride?: string | null): SheetParse {
  const warnings: string[] = [];
  const rows = table.rows.slice(0, LIMITS.maxRows);
  if (table.rows.length > LIMITS.maxRows) warnings.push(`Sheet truncated at ${LIMITS.maxRows} rows.`);
  const header = detectHeader(rows);
  if (!header) return { header: null, brandCandidates: [], productRows: [], blankRows: 0, totalRows: rows.length, warnings: [...warnings, "No Stock ID + Description header row found."] };

  const brandCandidates = detectBrandCandidates(rows, header.headerRow);
  const brandHint = brandHintOverride ?? (brandCandidates[0]?.text.replace(/\s*[\(\[].*?[\)\]]\s*$/, "").trim() ?? null);

  const productRows: ParsedRow[] = [];
  let blankRows = 0;
  for (let r = header.headerRow + 1; r < rows.length; r++) {
    const parsed = parseRow(rows, header, brandHint, r);
    if (!parsed) continue;
    if (parsed.isBlank) { blankRows++; continue; }
    productRows.push(parsed);
  }
  return { header, brandCandidates, productRows, blankRows, totalRows: rows.length, warnings };
}
