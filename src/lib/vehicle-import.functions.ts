import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Types ----------
export const CSV_COLUMNS = [
  "make","model","trim_name","engine_code","engine_name","engine_capacity_cc",
  "chassis_code","fuel_type","body_type","market",
  "production_year_from","production_year_to","pk_year_from","pk_year_to",
  "tyre_layout","standard_width","standard_profile","standard_rim",
  "front_width","front_profile","front_rim",
  "rear_width","rear_profile","rear_rim",
  "load_index","speed_rating","front_pressure_psi","rear_pressure_psi",
  "sae_grade","oil_type","api_spec","acea_spec","ilsac_spec","jaso_spec",
  "manufacturer_approvals","capacity_with_filter_l","capacity_without_filter_l",
  "change_interval_km","change_interval_months",
  "source_type","source_name","source_url","public_notes",
] as const;

const FUEL = ["petrol","diesel","hybrid","phev","ev","cng","lpg"];
const MARKET = ["PK","GLOBAL","JP_IMPORT","OTHER_IMPORT"];
const SOURCE = ["manufacturer","owner_manual","official_dealer","trusted_publication","community","other"];
const LAYOUT = ["same","staggered"];

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden");
}

// Neutralize spreadsheet-formula prefixes for display
function safeDisplay(v: string): string {
  if (typeof v !== "string") return v;
  return /^[=+\-@\t]/.test(v) ? `'${v}` : v;
}

// ---------- CSV parser (RFC-4180-ish, no formula execution) ----------
function parseCSV(text: string): string[][] {
  // strip UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
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
  return rows.filter(r => r.some(v => v.trim() !== ""));
}

// ---------- Validation helpers ----------
type Warn = { field?: string; message: string };
function toIntOrNull(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) && Number.isInteger(n) ? n : NaN as any;
}
function toNumOrNull(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : NaN as any;
}
function safeUrl(v: string | undefined): string | null {
  if (!v) return null;
  try { const u = new URL(v); return (u.protocol === "http:" || u.protocol === "https:") ? u.toString() : null; }
  catch { return null; }
}

function normalizeRow(headers: string[], rawRow: string[]) {
  const rec: Record<string,string> = {};
  headers.forEach((h, i) => { rec[h] = (rawRow[i] ?? "").trim(); });
  const warnings: Warn[] = [];
  const errors: Warn[] = [];

  const make = rec.make || "";
  const model = rec.model || "";
  if (!make) errors.push({ field: "make", message: "Required" });
  if (!model) errors.push({ field: "model", message: "Required" });

  // enums
  if (rec.fuel_type && !FUEL.includes(rec.fuel_type.toLowerCase())) {
    errors.push({ field: "fuel_type", message: `Must be one of ${FUEL.join(", ")}` });
  }
  const market = (rec.market || "PK").toUpperCase();
  if (!MARKET.includes(market)) errors.push({ field: "market", message: `Must be one of ${MARKET.join(", ")}` });
  if (rec.source_type && !SOURCE.includes(rec.source_type.toLowerCase())) {
    errors.push({ field: "source_type", message: `Must be one of ${SOURCE.join(", ")}` });
  }
  let layout = (rec.tyre_layout || "").toLowerCase();
  if (layout && !LAYOUT.includes(layout)) errors.push({ field: "tyre_layout", message: "Must be same or staggered" });

  // engine capacity
  let ecc: number | null = null;
  if (rec.engine_capacity_cc) {
    const n = Number(rec.engine_capacity_cc);
    if (!Number.isFinite(n) || n <= 0 || n > 12000 || !Number.isInteger(n)) errors.push({ field: "engine_capacity_cc", message: "Positive integer 50-12000" });
    else ecc = n;
  }

  // year ranges
  const yPF = toIntOrNull(rec.production_year_from);
  const yPT = toIntOrNull(rec.production_year_to);
  const yKF = toIntOrNull(rec.pk_year_from);
  const yKT = toIntOrNull(rec.pk_year_to);
  for (const [name, v] of [["production_year_from",yPF],["production_year_to",yPT],["pk_year_from",yKF],["pk_year_to",yKT]] as const) {
    if (Number.isNaN(v as number)) errors.push({ field: name, message: "Must be a whole year" });
  }
  if (yPF && yPT && yPF > yPT) errors.push({ field: "production_year_to", message: "Must be >= production_year_from" });
  if (yKF && yKT && yKF > yKT) errors.push({ field: "pk_year_to", message: "Must be >= pk_year_from" });

  // Tyre spec: accept either standard_* (both wheels same) or front_* (+ optional rear_*)
  let tyre: any = null;
  const hasStd = rec.standard_width || rec.standard_profile || rec.standard_rim;
  const hasFront = rec.front_width || rec.front_profile || rec.front_rim;
  const hasRear = rec.rear_width || rec.rear_profile || rec.rear_rim;
  if (hasStd || hasFront || hasRear) {
    let fw: any, fp: any, fr: any;
    if (hasStd) { fw = toIntOrNull(rec.standard_width); fp = toIntOrNull(rec.standard_profile); fr = toIntOrNull(rec.standard_rim); }
    else { fw = toIntOrNull(rec.front_width); fp = toIntOrNull(rec.front_profile); fr = toIntOrNull(rec.front_rim); }
    if (!fw || !fp || !fr || [fw,fp,fr].some(Number.isNaN)) {
      errors.push({ field: "tyre_size", message: "Complete width/profile/rim required for tyre spec (either standard_* or front_*)" });
    }
    if (!layout) layout = hasRear && !hasStd ? "staggered" : "same";
    if (layout === "staggered") {
      const rw = toIntOrNull(rec.rear_width), rp = toIntOrNull(rec.rear_profile), rr = toIntOrNull(rec.rear_rim);
      if (!rw || !rp || !rr) errors.push({ field: "rear_size", message: "Staggered layout needs rear_width/profile/rim" });
      tyre = { layout, front_width: fw, front_profile: fp, front_rim: fr, rear_width: rw, rear_profile: rp, rear_rim: rr };
    } else {
      tyre = { layout: "same", front_width: fw, front_profile: fp, front_rim: fr };
    }
    if (rec.load_index) tyre.front_load_index = toIntOrNull(rec.load_index);
    if (rec.speed_rating) tyre.front_speed_rating = rec.speed_rating.slice(0, 4);
    if (rec.source_type) tyre.source_type = rec.source_type.toLowerCase();
    const su = safeUrl(rec.source_url); if (su) tyre.source_url = su;
    if (rec.source_name) tyre.source_notes = safeDisplay(rec.source_name);
  }

  // Oil spec
  let oil: any = null;
  const hasOil = rec.sae_grade || rec.api_spec || rec.acea_spec || rec.ilsac_spec || rec.jaso_spec
    || rec.capacity_with_filter_l || rec.capacity_without_filter_l || rec.change_interval_km || rec.change_interval_months;
  if (hasOil) {
    if (!rec.sae_grade) errors.push({ field: "sae_grade", message: "Required when oil fields provided" });
    const capW = toNumOrNull(rec.capacity_with_filter_l);
    const capO = toNumOrNull(rec.capacity_without_filter_l);
    if (capW != null && (Number.isNaN(capW) || (capW as number) <= 0)) errors.push({ field: "capacity_with_filter_l", message: "Positive decimal" });
    if (capO != null && (Number.isNaN(capO) || (capO as number) <= 0)) errors.push({ field: "capacity_without_filter_l", message: "Positive decimal" });
    oil = {
      sae_grade: rec.sae_grade || "",
      api_standard: rec.api_spec || "",
      acea_standard: rec.acea_spec || "",
      ilsac_standard: rec.ilsac_spec || "",
      jaso_standard: rec.jaso_spec || "",
      capacity_with_filter_l: capW ?? "",
      capacity_without_filter_l: capO ?? "",
      change_interval_km: toIntOrNull(rec.change_interval_km) ?? "",
      change_interval_months: toIntOrNull(rec.change_interval_months) ?? "",
    };
    if (rec.manufacturer_approvals) {
      oil.oem_approvals = rec.manufacturer_approvals.split(/[;,]/).map(s => s.trim()).filter(Boolean);
    }
    if (rec.source_type) oil.source_type = rec.source_type.toLowerCase();
    const su = safeUrl(rec.source_url); if (su) oil.source_url = su;
    if (rec.source_name) oil.source_notes = safeDisplay(rec.source_name);
  }

  if (rec.source_url && !safeUrl(rec.source_url)) warnings.push({ field: "source_url", message: "URL ignored (must be http/https)" });

  const config: any = {
    trim_name: rec.trim_name || "",
    engine_code: rec.engine_code || "",
    engine_name: rec.engine_name || "",
    chassis_code: rec.chassis_code || "",
    engine_capacity_cc: ecc ?? "",
    fuel_type: rec.fuel_type ? rec.fuel_type.toLowerCase() : "",
    body_type: rec.body_type || "",
    market,
    production_year_from: yPF ?? "",
    production_year_to: yPT ?? "",
    pk_year_from: yKF ?? "",
    pk_year_to: yKT ?? "",
    source_type: rec.source_type ? rec.source_type.toLowerCase() : "",
    source_url: safeUrl(rec.source_url) ?? "",
    source_notes: safeDisplay(rec.source_name || ""),
  };

  return { rec, config, tyre, oil, warnings, errors, make: make.trim(), model: model.trim() };
}

// Identity key matches vc_identity_uidx normalization
function configKey(model_id: string, c: any): string {
  const s = (v: any) => (v ?? "").toString().trim().toLowerCase() || "∅";
  const i = (v: any) => (v === "" || v == null) ? -1 : Number(v);
  return [
    model_id, s(c.trim_name), s(c.engine_code), s(c.engine_name), s(c.chassis_code),
    i(c.engine_capacity_cc), s(c.fuel_type) || "∅", s(c.market) || "∅",
    i(c.production_year_from), i(c.production_year_to), i(c.pk_year_from), i(c.pk_year_to),
  ].join("|");
}

// ---------- Server Functions ----------
export const previewImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    filename: z.string().max(255),
    csv: z.string().max(5_000_000),
    conflict_strategy: z.enum(["skip","update"]).default("skip"),
    allow_partial: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const rows = parseCSV(data.csv);
    if (rows.length < 2) throw new Error("CSV must have a header row and at least one data row");
    if (rows.length - 1 > 2000) throw new Error("Max 2000 data rows per import");

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const unknownHeaders = headers.filter(h => h && !(CSV_COLUMNS as readonly string[]).includes(h));
    const dataRows = rows.slice(1);

    // Preload makes/models for match hints
    const { data: makes } = await context.supabase.from("vehicle_makes").select("id, name").eq("archived", false);
    const makeByName = new Map<string, string>((makes ?? []).map((m: any) => [m.name.toLowerCase().trim(), m.id]));
    const { data: models } = await context.supabase.from("vehicle_models").select("id, name, make_id").eq("archived", false);
    const modelByKey = new Map<string, string>((models ?? []).map((m: any) => [`${m.make_id}|${m.name.toLowerCase().trim()}`, m.id]));

    // Build normalized rows
    const parsed = dataRows.map((r, idx) => ({ row_number: idx + 2, ...normalizeRow(headers, r) }));

    // Duplicate detection within file (by candidate identity — pending make/model resolution)
    const seenInFile = new Map<string, number>();
    for (const p of parsed) {
      const key = `${p.make.toLowerCase()}|${p.model.toLowerCase()}|${configKey("_", p.config)}`;
      if (seenInFile.has(key)) p.warnings.push({ message: `Duplicate of row ${seenInFile.get(key)} in this file` });
      else seenInFile.set(key, p.row_number);
    }

    // Existing config detection (only for rows where model exists)
    const configIds: string[] = [];
    const previews: any[] = [];
    for (const p of parsed) {
      const make_id = makeByName.get(p.make.toLowerCase()) ?? null;
      const model_id = make_id ? modelByKey.get(`${make_id}|${p.model.toLowerCase()}`) ?? null : null;
      let existingConfigId: string | null = null;

      if (model_id) {
        // Look up existing config by identity
        const { data: existing } = await context.supabase
          .from("vehicle_configurations")
          .select("id, trim_name, engine_code, engine_name, chassis_code, engine_capacity_cc, fuel_type, market, production_year_from, production_year_to, pk_year_from, pk_year_to")
          .eq("model_id", model_id)
          .eq("archived", false);
        const wantKey = configKey(model_id, p.config);
        const match = (existing ?? []).find((e: any) => configKey(model_id, e) === wantKey);
        if (match) existingConfigId = match.id;
      }

      let outcome: "create" | "update" | "skip" | "invalid";
      let conflictAction: "insert" | "update" | "skip" = "insert";
      if (p.errors.length) outcome = "invalid";
      else if (existingConfigId) {
        if (data.conflict_strategy === "skip") { outcome = "skip"; conflictAction = "skip"; }
        else { outcome = "update"; conflictAction = "update"; }
      } else outcome = "create";

      const payload = {
        action: outcome === "skip" ? "skip" : outcome === "invalid" ? "error" : "commit",
        make: { id: make_id, name: p.make, create: !make_id },
        model: { id: model_id, name: p.model, body_type: p.rec.body_type || "sedan", create: !model_id && !!p.make },
        config: { ...p.config, existing_id: existingConfigId, conflict_action: conflictAction },
        tyre: p.tyre,
        oil: p.oil,
      };

      previews.push({
        row_number: p.row_number,
        make: p.make, model: p.model,
        make_action: make_id ? "reuse" : "create",
        model_action: model_id ? "reuse" : "create",
        outcome,
        has_tyre: !!p.tyre,
        has_oil: !!p.oil,
        errors: p.errors,
        warnings: p.warnings,
        summary: `${p.config.trim_name || "—"} ${p.config.engine_code || ""} ${p.config.market} ${p.config.production_year_from || ""}${p.config.production_year_to ? "-" + p.config.production_year_to : ""}`.trim(),
        payload,
      });
    }

    // Create batch + rows
    const totals = previews.reduce((a, p) => {
      a[p.outcome] = (a[p.outcome] ?? 0) + 1; return a;
    }, {} as Record<string, number>);

    const { data: batch, error: bErr } = await context.supabase.from("import_batches").insert({
      kind: "vehicle_spec",
      filename: data.filename.slice(0, 255),
      uploader: context.userId,
      status: "previewed",
      conflict_strategy: data.conflict_strategy,
      allow_partial: data.allow_partial,
      totals,
    }).select("id").maybeSingle();
    if (bErr) throw new Error(bErr.message);

    const batchId = (batch as any).id;
    const rowsPayload = previews.map(p => ({
      batch_id: batchId,
      row_number: p.row_number,
      status: "pending",
      source_payload: p.payload,
      error_message: p.errors.length ? p.errors.map(e => `${e.field ?? ""}: ${e.message}`).join("; ") : null,
    }));
    // chunked insert
    for (let i = 0; i < rowsPayload.length; i += 500) {
      const { error } = await context.supabase.from("import_batch_rows").insert(rowsPayload.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }

    return { batchId, totals, unknownHeaders, previews };
  });

export const commitImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ batchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: res, error } = await context.supabase.rpc("apply_vehicle_import_batch", { _batch_id: data.batchId });
    if (error) {
      // Mark failed via a separate request
      await context.supabase.from("import_batches").update({ status: "failed", error_summary: error.message }).eq("id", data.batchId);
      throw new Error(error.message);
    }
    return res;
  });

export const rollbackImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ batchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: res, error } = await context.supabase.rpc("rollback_vehicle_import_batch", { _batch_id: data.batchId });
    if (error) {
      await context.supabase.from("import_batches").update({ status: "rollback_failed", error_summary: error.message }).eq("id", data.batchId);
      throw new Error(error.message);
    }
    return res;
  });

export const cancelBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ batchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from("import_batches").update({ status: "cancelled" }).eq("id", data.batchId).eq("status", "previewed");
    return { ok: true };
  });

export const listBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("import_batches")
      .select("id, filename, uploader, status, totals, conflict_strategy, allow_partial, error_summary, rollback_expires_at, committed_at, rolled_back_at, created_at")
      .eq("kind", "vehicle_spec").order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const getBatchRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ batchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows } = await context.supabase.from("import_batch_rows")
      .select("row_number, status, action, target_table, target_id, error_message, source_payload, after_snapshot, source_payload_purged_at")
      .eq("batch_id", data.batchId).order("row_number");
    return rows ?? [];
  });

export const listReviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data: cfgs }, { data: tyres }, { data: oils }] = await Promise.all([
      context.supabase.from("vehicle_configurations").select("id, trim_name, engine_code, market, source_type, source_url, model_id, updated_at").eq("verification_status", "needs_verification").eq("archived", false).order("updated_at", { ascending: false }).limit(200),
      context.supabase.from("vehicle_oem_tyre_specs").select("id, configuration_id, front_size_label, rear_size_label, source_type, updated_at").eq("verification_status", "needs_verification").eq("archived", false).order("updated_at", { ascending: false }).limit(200),
      context.supabase.from("vehicle_oem_oil_specs").select("id, configuration_id, sae_grade, api_standard, source_type, updated_at").eq("verification_status", "needs_verification").eq("archived", false).order("updated_at", { ascending: false }).limit(200),
    ]);
    return { configurations: cfgs ?? [], tyreSpecs: tyres ?? [], oilSpecs: oils ?? [] };
  });
