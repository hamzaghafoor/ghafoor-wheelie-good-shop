import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  parseCSV, parseSheet, sanitizeCell, LIMITS, suggestCategory, parseDigitleyPdfText,
  type SheetTable, type ParsedRow, type BrandCandidate, type DigitleyMeta,
} from "@/lib/erp-parser";
import * as XLSX from "xlsx";


// --------- Helpers ---------
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden");
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function readWorkbookTables(bytes: Uint8Array, filename: string): SheetTable[] {
  const isCSV = /\.csv$/i.test(filename);
  if (isCSV) {
    const text = new TextDecoder("utf-8").decode(bytes);
    return [{ name: "sheet1", rows: parseCSV(text) }];
  }
  // xlsx/xls
  const wb = XLSX.read(bytes, { type: "array", cellFormula: false, cellHTML: false, cellDates: false });
  const names = wb.SheetNames.slice(0, LIMITS.maxSheets);
  return names.map((name) => {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "", blankrows: true, raw: false });
    // Sanitize every cell defensively (formulas are already dropped by SheetJS with cellFormula:false).
    const rows = (aoa as any[][]).slice(0, LIMITS.maxRows).map((r) => r.map(sanitizeCell));
    return { name, rows };
  });
}

// --------- Row payload shape (stored in import_batch_rows.source_payload) ---------
export type RowPayload = {
  action: "create_family" | "add_variant" | "update_variant" | "skip" | "invalid" | "needs_review";
  include: boolean;
  erp_stock_id: string;
  erp_description: string;
  brand: {
    match_type: "existing" | "new" | "unresolved";
    brand_id?: string | null;
    new_brand_name?: string | null;
    batch_brand_key?: string;
    detected_text?: string | null;
  };
  product: {
    product_id?: string | null;         // existing family (update)
    family_key?: string | null;         // groups rows in this batch
    name: string;
    category: string | null;            // product_category enum literal or null
    product_type_id?: string | null;
    purpose_label_ids?: string[];
    erp_description: string;
  };
  variant: {
    variant_id?: string | null;
    pack_value: number | null;
    pack_unit_code: string | null;
    pack_label?: string | null;
    no_pack_required?: boolean;
  };
  warnings: string[];
};

// --------- Preview ---------
export const previewCatalogueImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { filename: string; fileB64: string; mime?: string }) => {
    return z.object({
      filename: z.string().min(1).max(200),
      fileB64: z.string().min(4),
      mime: z.string().optional(),
    }).parse(data);
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { filename, fileB64 } = data;
    if (!/\.(csv|xlsx|xls)$/i.test(filename)) throw new Error("Only .csv, .xls or .xlsx files are supported.");
    const bytes = b64ToBytes(fileB64);
    if (bytes.byteLength > LIMITS.maxFileBytes) throw new Error(`File too large (max ${(LIMITS.maxFileBytes / 1_000_000).toFixed(1)} MB).`);

    let tables: SheetTable[];
    try {
      tables = readWorkbookTables(bytes, filename);
    } catch (e: any) {
      throw new Error(`Could not read spreadsheet: ${e?.message ?? "unknown error"}`);
    }
    if (tables.length === 0) throw new Error("No worksheets found.");

    // Parse every sheet; pick the first with a valid header + rows as default.
    const sheetSummaries = tables.map((t) => {
      const parsed = parseSheet(t);
      return { name: t.name, parsed, table: t };
    });
    const chosen =
      sheetSummaries.find((s) => s.parsed.header && s.parsed.productRows.length > 0) ??
      sheetSummaries[0];
    const parsed = chosen.parsed;

    if (!parsed.header) throw new Error("Could not detect a header row containing Stock ID and Description in any worksheet.");

    // Existing brand match for each brand candidate
    const norms = parsed.brandCandidates.map((c) => c.normalized).filter(Boolean);
    let existingBrands: Array<{ id: string; name: string; name_normalized: string }> = [];
    if (norms.length) {
      const { data: bs } = await (context as any).supabase
        .from("brands").select("id, name, name_normalized")
        .in("name_normalized", norms);
      existingBrands = (bs ?? []) as any[];
    }
    const brandMatches = parsed.brandCandidates.map((c) => {
      const hit = existingBrands.find((b) => b.name_normalized === c.normalized);
      return { ...c, existing_brand_id: hit?.id ?? null, existing_brand_name: hit?.name ?? null };
    });

    // Build row payloads (unresolved: brand and category left to admin)
    const rowPayloads: RowPayload[] = parsed.productRows.map((r: ParsedRow) => {
      const isInvalid = !r.erpDescription || r.isPlaceholder;
      const action: RowPayload["action"] = isInvalid ? "skip" : "needs_review";
      return {
        action,
        include: !isInvalid,
        erp_stock_id: r.erpStockId,
        erp_description: r.erpDescription,
        brand: { match_type: "unresolved", detected_text: r.brandHint ?? null },
        product: {
          family_key: r.familyKey,
          name: r.suggestedFamilyName || r.erpDescription,
          category: null,
          erp_description: r.erpDescription,
        },
        variant: {
          pack_value: r.pack.ok ? r.pack.value : null,
          pack_unit_code: r.pack.ok ? r.pack.unit : null,
          no_pack_required: false,
        },
        warnings: r.warnings,
      };
    });

    // Insert batch (draft) + rows
    const supabase = (context as any).supabase;
    const { data: batchIns, error: bErr } = await supabase.from("import_batches").insert({
      kind: "catalogue",
      filename,
      uploader: (context as any).userId,
      status: "previewed",
      totals: {
        preview: {
          sheet: chosen.name,
          sheets: sheetSummaries.map((s) => s.name),
          header_row: parsed.header.headerRow,
          stock_col: parsed.header.stockCol,
          desc_col: parsed.header.descCol,
          blank_rows: parsed.blankRows,
          candidate_row_count: parsed.productRows.length,
          brand_candidates: brandMatches,
          brand_decision: null,
          warnings: parsed.warnings,
        },
      },
    }).select("id").single();
    if (bErr || !batchIns) throw new Error(bErr?.message ?? "Failed to create import batch");
    const batchId = batchIns.id as string;

    if (rowPayloads.length > 0) {
      const rowsToInsert = rowPayloads.map((p, i) => ({
        batch_id: batchId,
        row_number: i + 1,
        source_payload: p as any,
      }));
      // insert in chunks
      for (let i = 0; i < rowsToInsert.length; i += 500) {
        const chunk = rowsToInsert.slice(i, i + 500);
        const { error: rErr } = await supabase.from("import_batch_rows").insert(chunk);
        if (rErr) throw new Error(rErr.message);
      }
    }

    return {
      batchId,
      sheet: chosen.name,
      sheets: sheetSummaries.map((s) => ({ name: s.name, hasHeader: !!s.parsed.header, rowCount: s.parsed.productRows.length })),
      header: { row: parsed.header.headerRow, stockCol: parsed.header.stockCol, descCol: parsed.header.descCol, columns: parsed.header.columnNames },
      brandCandidates: brandMatches,
      totals: {
        candidateRows: parsed.productRows.length,
        blankRows: parsed.blankRows,
        needsReview: rowPayloads.filter((r) => r.action === "needs_review").length,
        skipped: rowPayloads.filter((r) => r.action === "skip").length,
      },
      warnings: parsed.warnings,
    };
  });

// --------- Get preview data for an existing batch ---------
export const getCataloguePreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { batchId: string }) => z.object({ batchId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { data: batch, error } = await supabase.from("import_batches").select("*").eq("id", data.batchId).single();
    if (error || !batch) throw new Error(error?.message ?? "Batch not found");
    if (batch.kind !== "catalogue") throw new Error("Not a catalogue import batch");
    const { data: rows } = await supabase.from("import_batch_rows").select("*").eq("batch_id", data.batchId).order("row_number");
    return { batch, rows: rows ?? [] };
  });

// --------- Brand decision ---------
export const confirmCatalogueBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { batchId: string; brandId?: string | null; newBrandName?: string | null; applyToAllRows?: boolean }) =>
    z.object({
      batchId: z.string().uuid(),
      brandId: z.string().uuid().nullable().optional(),
      newBrandName: z.string().min(1).max(80).nullable().optional(),
      applyToAllRows: z.boolean().optional(),
    }).refine((v) => v.brandId || v.newBrandName, { message: "Must select an existing brand or provide a new brand name." }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { data: b } = await supabase.from("import_batches").select("id, kind, status, totals").eq("id", data.batchId).single();
    if (!b) throw new Error("Batch not found");
    if (b.kind !== "catalogue") throw new Error("Not a catalogue batch");
    if (!["draft", "previewed"].includes(b.status)) throw new Error("Batch is no longer editable");

    const totals = (b.totals ?? {}) as any;
    const preview = totals.preview ?? {};
    const decision = data.brandId
      ? { type: "existing", brandId: data.brandId }
      : { type: "new", newBrandName: data.newBrandName?.trim(), batchBrandKey: (data.newBrandName ?? "").toLowerCase().replace(/\s+/g, "") };
    preview.brand_decision = decision;
    await supabase.from("import_batches").update({ totals: { ...totals, preview } }).eq("id", data.batchId);

    if (data.applyToAllRows !== false) {
      // Update every row's source_payload.brand to point at this decision (no brand is created here).
      const { data: rows } = await supabase.from("import_batch_rows").select("id, source_payload").eq("batch_id", data.batchId);
      for (const r of rows ?? []) {
        const payload = { ...(r.source_payload as any) };
        payload.brand = decision.type === "existing"
          ? { match_type: "existing", brand_id: decision.brandId, detected_text: payload.brand?.detected_text ?? null }
          : { match_type: "new", new_brand_name: decision.newBrandName, batch_brand_key: decision.batchBrandKey, detected_text: payload.brand?.detected_text ?? null };
        await supabase.from("import_batch_rows").update({ source_payload: payload }).eq("id", r.id);
      }
    }
    return { ok: true, decision };
  });

// --------- Row edits ---------
const rowPatchSchema = z.object({
  action: z.enum(["create_family", "add_variant", "update_variant", "skip", "invalid", "needs_review"]).optional(),
  include: z.boolean().optional(),
  product: z.object({
    product_id: z.string().uuid().nullable().optional(),
    family_key: z.string().nullable().optional(),
    name: z.string().max(200).optional(),
    category: z.enum(["tyres", "lubricants", "filters", "maintenance_parts", "car_care", "additives", "accessories", "services"]).nullable().optional(),
    product_type_id: z.string().uuid().nullable().optional(),
    purpose_label_ids: z.array(z.string().uuid()).optional(),
  }).partial().optional(),
  variant: z.object({
    variant_id: z.string().uuid().nullable().optional(),
    pack_value: z.number().positive().nullable().optional(),
    pack_unit_code: z.string().max(20).nullable().optional(),
    pack_label: z.string().max(80).nullable().optional(),
    no_pack_required: z.boolean().optional(),
  }).partial().optional(),
});

export const updateCataloguePreviewRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { batchId: string; rowId: string; patch: any }) => z.object({
    batchId: z.string().uuid(), rowId: z.string().uuid(), patch: rowPatchSchema,
  }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { data: row } = await supabase.from("import_batch_rows").select("id, source_payload").eq("id", data.rowId).eq("batch_id", data.batchId).single();
    if (!row) throw new Error("Row not found");
    const merged: any = { ...(row.source_payload as any) };
    const p = data.patch as any;
    if (p.action !== undefined) merged.action = p.action;
    if (p.include !== undefined) merged.include = p.include;
    if (p.product) merged.product = { ...merged.product, ...p.product };
    if (p.variant) merged.variant = { ...merged.variant, ...p.variant };
    await supabase.from("import_batch_rows").update({ source_payload: merged }).eq("id", data.rowId);
    return { ok: true, row: merged };
  });

export const bulkUpdateCataloguePreviewRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { batchId: string; rowIds: string[]; patch: any }) => z.object({
    batchId: z.string().uuid(), rowIds: z.array(z.string().uuid()).min(1).max(2000), patch: rowPatchSchema,
  }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { data: rows } = await supabase.from("import_batch_rows").select("id, source_payload").in("id", data.rowIds).eq("batch_id", data.batchId);
    const p = data.patch as any;
    for (const r of rows ?? []) {
      const merged: any = { ...(r.source_payload as any) };
      if (p.action !== undefined) merged.action = p.action;
      if (p.include !== undefined) merged.include = p.include;
      if (p.product) merged.product = { ...merged.product, ...p.product };
      if (p.variant) merged.variant = { ...merged.variant, ...p.variant };
      await supabase.from("import_batch_rows").update({ source_payload: merged }).eq("id", r.id);
    }
    return { ok: true, updated: rows?.length ?? 0 };
  });

// --------- Group / ungroup ---------
export const groupCatalogueRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { batchId: string; rowIds: string[]; familyKey: string; familyName?: string }) =>
    z.object({ batchId: z.string().uuid(), rowIds: z.array(z.string().uuid()).min(1), familyKey: z.string().min(1).max(200), familyName: z.string().max(200).optional() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { data: rows } = await supabase.from("import_batch_rows").select("id, source_payload").in("id", data.rowIds).eq("batch_id", data.batchId);
    for (const r of rows ?? []) {
      const merged: any = { ...(r.source_payload as any) };
      merged.product = { ...merged.product, family_key: data.familyKey, ...(data.familyName ? { name: data.familyName } : {}) };
      await supabase.from("import_batch_rows").update({ source_payload: merged }).eq("id", r.id);
    }
    return { ok: true };
  });

export const ungroupCatalogueRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { batchId: string; rowId: string }) => z.object({ batchId: z.string().uuid(), rowId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { data: row } = await supabase.from("import_batch_rows").select("id, source_payload").eq("id", data.rowId).eq("batch_id", data.batchId).single();
    if (!row) throw new Error("Row not found");
    const merged: any = { ...(row.source_payload as any) };
    merged.product = { ...merged.product, family_key: `solo-${data.rowId}` };
    await supabase.from("import_batch_rows").update({ source_payload: merged }).eq("id", data.rowId);
    return { ok: true };
  });

// --------- Commit ---------
export const commitCatalogueImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { batchId: string }) => z.object({ batchId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    // Final validation
    const { data: rows } = await supabase.from("import_batch_rows").select("source_payload").eq("batch_id", data.batchId);
    const included = (rows ?? []).map((r: any) => r.source_payload).filter((p: any) => p?.include);
    if (included.length === 0) throw new Error("No included rows to import.");
    for (const p of included) {
      if (p.action === "needs_review" || p.action === "invalid") throw new Error("Some included rows are still marked Needs Review or Invalid.");
      if (!p.brand?.brand_id && !(p.brand?.match_type === "new" && p.brand?.new_brand_name)) throw new Error("Brand not confirmed on every included row.");
      if (!p.product?.name || !p.product?.category) throw new Error("Every included row needs a family name and category.");
      if (!p.variant?.no_pack_required && (p.variant?.pack_value == null || !p.variant?.pack_unit_code)) throw new Error("Every included row needs a pack, or must be marked No pack required.");
    }
    const seen = new Set<string>();
    for (const p of included) {
      const sid = (p.erp_stock_id || "").toLowerCase();
      if (!sid) continue;
      if (seen.has(sid)) throw new Error("Duplicate ERP Stock IDs remain in included rows.");
      seen.add(sid);
    }

    const { data: rpcRes, error: rpcErr } = await supabase.rpc("apply_catalogue_import_batch", { _batch_id: data.batchId });
    if (rpcErr) {
      // Separate request to mark batch failed after the RPC transaction failed.
      await supabase.from("import_batches").update({ status: "failed", error_summary: rpcErr.message }).eq("id", data.batchId);
      throw new Error(rpcErr.message);
    }
    return rpcRes;
  });

// --------- Rollback / cancel ---------
export const rollbackCatalogueImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { batchId: string }) => z.object({ batchId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { data: rpcRes, error } = await supabase.rpc("rollback_catalogue_import_batch", { _batch_id: data.batchId });
    if (error) throw new Error(error.message);
    return rpcRes;
  });

export const cancelCatalogueBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { batchId: string }) => z.object({ batchId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { error } = await supabase.from("import_batches").update({ status: "cancelled" }).eq("id", data.batchId).in("status", ["draft", "previewed"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --------- History / review lists ---------
export const listCatalogueBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { data, error } = await supabase.from("import_batches").select("*").eq("kind", "catalogue").order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listCatalogueReviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    // Draft products imported from ERP; join brand
    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, brand_id, status, archived, product_type_id, erp_description, created_at, updated_at, brands(name), product_variants(id, pack_label, erp_stock_id, status)")
      .eq("status", "draft").eq("archived", false)
      .not("erp_description", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// --------- Brand suggestion search (for confirmation step) ---------
export const searchBrandsForImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { q: string }) => z.object({ q: z.string().max(80) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { data: rows } = await supabase.from("brands").select("id, name, name_normalized").ilike("name", `%${data.q}%`).eq("archived", false).limit(15);
    return rows ?? [];
  });

// --------- Product types / categories helper (for admin select boxes) ---------
export const getCatalogueImportLookups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const [types, existingBrands] = await Promise.all([
      supabase.from("product_types").select("id, name, category").order("name"),
      supabase.from("brands").select("id, name, name_normalized").eq("archived", false).order("name"),
    ]);
    return { productTypes: types.data ?? [], brands: existingBrands.data ?? [] };
  });
