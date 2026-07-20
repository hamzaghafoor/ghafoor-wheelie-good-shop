
-- 1) Fix auto pack_label: strip trailing dot when value has no fractional part
CREATE OR REPLACE FUNCTION public.compute_variant_normalization()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE u RECORD; _num text;
BEGIN
  SELECT kind, factor_to_base, display_label INTO u
  FROM public.packaging_units WHERE code = NEW.pack_unit_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown packaging unit: %', NEW.pack_unit_code;
  END IF;
  NEW.normalized_kind := u.kind;
  NEW.normalized_base_qty := NEW.pack_value * u.factor_to_base;
  IF NEW.pack_label IS NULL OR btrim(NEW.pack_label) = '' THEN
    _num := to_char(NEW.pack_value, 'FM999999990.999');
    -- Strip trailing zeros after decimal, then any lone trailing dot
    _num := regexp_replace(_num, '(\.[0-9]*?)0+$', '\1');
    _num := regexp_replace(_num, '\.$', '');
    IF _num = '' THEN _num := '0'; END IF;
    NEW.pack_label := _num || ' ' || u.display_label;
  END IF;
  RETURN NEW;
END $function$;

-- Backfill any existing labels that carry the trailing-dot artifact
UPDATE public.product_variants
SET pack_label = NULL
WHERE pack_label ~ '^[0-9]+\. ';

-- 2) Column-level anon revoke on sensitive fields
REVOKE SELECT (internal_notes, erp_description, private_notes) ON public.products FROM anon;
REVOKE SELECT (erp_stock_id, private_notes) ON public.product_variants FROM anon;
-- Ensure other columns still selectable by anon (RLS still applies row-wise)
GRANT SELECT (
  id, name, slug, category, brand_id, product_type_id, purpose_label_ids,
  sku, part_number, images, specs, short_desc, full_desc, is_featured,
  price, previous_price, price_mode, price_note, availability, status,
  archived, updated_at, created_at
) ON public.products TO anon;
GRANT SELECT (
  id, product_id, pack_value, pack_unit_code, pack_label,
  normalized_base_qty, normalized_kind, price, compare_at_price,
  availability, image_path, is_default, display_order, status,
  archived, updated_at, created_at
) ON public.product_variants TO anon;

-- 3) Deletion safety trigger on product_variants: block hard-delete of
-- published, ever-ERP-tagged, or image-attached variants; archive first.
CREATE OR REPLACE FUNCTION public.guard_variant_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'published' THEN
    RAISE EXCEPTION 'Cannot delete a published variant. Unpublish and archive it first.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.erp_stock_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot delete a variant that has an ERP Stock ID (%). Archive it to preserve ERP history.', OLD.erp_stock_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.image_path IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot delete a variant that has an uploaded image. Remove the image first, or archive the variant.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS pv_guard_delete ON public.product_variants;
CREATE TRIGGER pv_guard_delete
BEFORE DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.guard_variant_delete();
