
-- ============================================================
-- 1) PACKLESS SUPPORT
-- ============================================================
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS is_packless boolean NOT NULL DEFAULT false;

ALTER TABLE public.product_variants ALTER COLUMN pack_value DROP NOT NULL;
ALTER TABLE public.product_variants ALTER COLUMN pack_unit_code DROP NOT NULL;
ALTER TABLE public.product_variants ALTER COLUMN normalized_base_qty DROP NOT NULL;
ALTER TABLE public.product_variants ALTER COLUMN normalized_kind DROP NOT NULL;

ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_pack_value_check;
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_pack_value_check
  CHECK (
    (is_packless AND pack_value IS NULL) OR
    (NOT is_packless AND pack_value IS NOT NULL AND pack_value > 0)
  );

ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_packless_shape;
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_packless_shape
  CHECK (
    (is_packless
       AND pack_unit_code IS NULL
       AND normalized_base_qty IS NULL
       AND normalized_kind IS NULL)
    OR
    (NOT is_packless
       AND pack_unit_code IS NOT NULL
       AND normalized_base_qty IS NOT NULL
       AND normalized_kind IS NOT NULL)
  );

-- Update the normalization trigger: short-circuit for packless variants,
-- default a sensible display label if the admin didn't provide one.
CREATE OR REPLACE FUNCTION public.compute_variant_normalization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE u RECORD; _num text;
BEGIN
  IF NEW.is_packless THEN
    NEW.pack_value := NULL;
    NEW.pack_unit_code := NULL;
    NEW.normalized_base_qty := NULL;
    NEW.normalized_kind := NULL;
    IF NEW.pack_label IS NULL OR btrim(NEW.pack_label) = '' THEN
      NEW.pack_label := 'No Pack Size';
    END IF;
    RETURN NEW;
  END IF;

  SELECT kind, factor_to_base, display_label INTO u
  FROM public.packaging_units WHERE code = NEW.pack_unit_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown packaging unit: %', NEW.pack_unit_code;
  END IF;
  NEW.normalized_kind := u.kind;
  NEW.normalized_base_qty := NEW.pack_value * u.factor_to_base;
  IF NEW.pack_label IS NULL OR btrim(NEW.pack_label) = '' THEN
    _num := to_char(NEW.pack_value, 'FM999999990.999');
    _num := regexp_replace(_num, '(\.[0-9]*?)0+$', '\1');
    _num := regexp_replace(_num, '\.$', '');
    IF _num = '' THEN _num := '0'; END IF;
    NEW.pack_label := _num || ' ' || u.display_label;
  END IF;
  RETURN NEW;
END $function$;

-- ============================================================
-- 2) CATALOGUE APPLY — capture exact per-target updated_at,
--    and insert packless variants correctly (no more 1 pcs fake).
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_catalogue_import_batch(_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _batch RECORD;
  _row RECORD;
  _payload jsonb;
  _created_families int := 0;
  _added_variants   int := 0;
  _updated_variants int := 0;
  _skipped int := 0;
  _failed  int := 0;
  _brand_id uuid;
  _brand_key text;
  _brand_created boolean;
  _batch_brand_map jsonb := '{}'::jsonb;
  _family_key text;
  _family_id uuid;
  _batch_family_map jsonb := '{}'::jsonb;
  _variant_id uuid;
  _pack_value numeric;
  _pack_unit  text;
  _pack_label text;
  _is_packless boolean;
  _tables text[];
  _ids uuid[];
  _updated_at_map jsonb;
  _last_updated_at timestamptz;
  _u timestamptz;
  _before jsonb;
  _after jsonb;
  _new_name text;
  _prod_category public.product_category;
  _prod_type_id uuid;
  _slug text;
BEGIN
  IF NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='insufficient_privilege';
  END IF;

  SELECT * INTO _batch FROM public.import_batches WHERE id=_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF _batch.kind <> 'catalogue' THEN
    RAISE EXCEPTION 'Wrong batch kind (expected catalogue, got %)', _batch.kind;
  END IF;
  IF _batch.status <> 'previewed' THEN
    RAISE EXCEPTION 'Batch must be in previewed state (is %)', _batch.status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.import_batch_rows r
    WHERE r.batch_id=_batch_id
      AND (r.source_payload->>'include')::boolean IS TRUE
      AND r.source_payload->>'action' IN ('invalid','needs_review')
  ) THEN
    RAISE EXCEPTION 'Batch contains unresolved invalid or needs_review rows';
  END IF;

  IF EXISTS (
    SELECT lower(r.source_payload->>'erp_stock_id') sid
    FROM public.import_batch_rows r
    WHERE r.batch_id=_batch_id
      AND (r.source_payload->>'include')::boolean IS TRUE
      AND coalesce(r.source_payload->>'erp_stock_id','') <> ''
    GROUP BY 1 HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate ERP Stock IDs in included rows';
  END IF;

  UPDATE public.import_batches SET status='committing' WHERE id=_batch_id;

  FOR _row IN
    SELECT * FROM public.import_batch_rows
    WHERE batch_id=_batch_id AND status='pending'
    ORDER BY row_number
  LOOP
    _payload := _row.source_payload;
    _tables := ARRAY[]::text[];
    _ids := ARRAY[]::uuid[];
    _updated_at_map := '{}'::jsonb;
    _last_updated_at := NULL;
    _before := '{}'::jsonb;
    _after := '{}'::jsonb;

    IF NOT COALESCE((_payload->>'include')::boolean, false)
       OR _payload->>'action' IN ('skip','invalid','needs_review') THEN
      UPDATE public.import_batch_rows SET status='skipped', action='skip' WHERE id=_row.id;
      _skipped := _skipped + 1;
      CONTINUE;
    END IF;

    -- Brand
    _brand_id := NULL;
    _brand_created := false;
    _brand_key := lower(coalesce(_payload->'brand'->>'batch_brand_key',''));

    IF (_payload->'brand'->>'brand_id') IS NOT NULL AND (_payload->'brand'->>'brand_id') <> '' THEN
      _brand_id := (_payload->'brand'->>'brand_id')::uuid;
    ELSIF _brand_key <> '' AND _batch_brand_map ? _brand_key THEN
      _brand_id := (_batch_brand_map->_brand_key->>'id')::uuid;
    ELSIF (_payload->'brand'->>'match_type') = 'new'
          AND coalesce(_payload->'brand'->>'new_brand_name','') <> '' THEN
      _new_name := btrim(_payload->'brand'->>'new_brand_name');
      SELECT id INTO _brand_id
      FROM public.brands
      WHERE name_normalized = lower(regexp_replace(_new_name,'\s+','','g'))
        AND archived=false
      LIMIT 1;
      IF _brand_id IS NULL THEN
        _slug := lower(regexp_replace(_new_name,'[^a-zA-Z0-9]+','-','g'));
        _slug := regexp_replace(_slug,'(^-+)|(-+$)','','g');
        IF EXISTS (SELECT 1 FROM public.brands WHERE slug=_slug) THEN
          _slug := _slug || '-' || substr(md5(random()::text),1,6);
        END IF;
        INSERT INTO public.brands(name, slug, is_active, status, created_by)
        VALUES (_new_name, _slug, true, 'draft'::content_status, _uid)
        RETURNING id, updated_at INTO _brand_id, _u;
        _brand_created := true;
        _tables := ARRAY['brands']; _ids := ARRAY[_brand_id];
        _updated_at_map := _updated_at_map || jsonb_build_object(_brand_id::text, to_jsonb(_u));
        _last_updated_at := _u;
      END IF;
      IF _brand_key <> '' THEN
        _batch_brand_map := _batch_brand_map || jsonb_build_object(
          _brand_key, jsonb_build_object('id',_brand_id,'created',_brand_created)
        );
      END IF;
    ELSE
      RAISE EXCEPTION 'Row %: brand not confirmed', _row.row_number;
    END IF;

    -- Product family
    _family_id := NULL;
    _family_key := coalesce(_payload->'product'->>'family_key','');

    IF (_payload->'product'->>'product_id') IS NOT NULL AND (_payload->'product'->>'product_id') <> '' THEN
      _family_id := (_payload->'product'->>'product_id')::uuid;
    ELSIF _family_key <> '' AND _batch_family_map ? _family_key THEN
      _family_id := (_batch_family_map->>_family_key)::uuid;
    END IF;

    IF _family_id IS NULL THEN
      _new_name := btrim(coalesce(_payload->'product'->>'name',''));
      IF _new_name = '' THEN
        RAISE EXCEPTION 'Row %: product family name is required', _row.row_number;
      END IF;
      _prod_category := (_payload->'product'->>'category')::public.product_category;
      _prod_type_id := NULLIF(_payload->'product'->>'product_type_id','')::uuid;

      _slug := lower(regexp_replace(_new_name,'[^a-zA-Z0-9]+','-','g'));
      _slug := regexp_replace(_slug,'(^-+)|(-+$)','','g');
      IF EXISTS (SELECT 1 FROM public.products WHERE category=_prod_category AND slug=_slug) THEN
        _slug := _slug || '-' || substr(md5(random()::text),1,6);
      END IF;

      INSERT INTO public.products(
        category, brand_id, name, slug, product_type_id, purpose_label_ids,
        erp_description, internal_notes, status, availability, archived, created_by
      ) VALUES (
        _prod_category, _brand_id, _new_name, _slug, _prod_type_id,
        COALESCE(
          (SELECT array_agg((x)::uuid) FROM jsonb_array_elements_text(_payload->'product'->'purpose_label_ids') x),
          '{}'::uuid[]),
        NULLIF(_payload->'product'->>'erp_description',''),
        'Imported from ERP batch ' || _batch_id::text,
        'draft'::content_status, 'check'::availability_status, false, _uid
      ) RETURNING id, updated_at INTO _family_id, _u;

      _tables := _tables || 'products'; _ids := _ids || _family_id;
      _updated_at_map := _updated_at_map || jsonb_build_object(_family_id::text, to_jsonb(_u));
      _last_updated_at := _u;
      _created_families := _created_families + 1;

      IF _family_key <> '' THEN
        _batch_family_map := _batch_family_map || jsonb_build_object(_family_key, _family_id::text);
      END IF;
    END IF;

    -- Variant
    _variant_id := NULLIF(_payload->'variant'->>'variant_id','')::uuid;
    _is_packless := COALESCE((_payload->'variant'->>'no_pack_required')::boolean, false);
    _pack_label := NULLIF(_payload->'variant'->>'pack_label','');

    IF _is_packless THEN
      _pack_value := NULL;
      _pack_unit  := NULL;
    ELSE
      _pack_value := NULLIF(_payload->'variant'->>'pack_value','')::numeric;
      _pack_unit  := NULLIF(_payload->'variant'->>'pack_unit_code','');
    END IF;

    IF _variant_id IS NOT NULL AND _payload->>'action' = 'update_variant' THEN
      -- Conservative: refresh admin-only erp_description on parent family; never touch variant fields.
      SELECT jsonb_build_object('products', jsonb_build_object('id',p.id,'erp_description',p.erp_description))
        INTO _before FROM public.products p WHERE p.id=_family_id;

      UPDATE public.products
      SET erp_description = COALESCE(NULLIF(_payload->'product'->>'erp_description',''), erp_description),
          updated_at = now()
      WHERE id=_family_id
      RETURNING updated_at INTO _u;

      _tables := _tables || 'products.update'; _ids := _ids || _family_id;
      _updated_at_map := _updated_at_map || jsonb_build_object(_family_id::text, to_jsonb(_u));
      _last_updated_at := _u;
      _updated_variants := _updated_variants + 1;
    ELSE
      IF NOT _is_packless AND (_pack_value IS NULL OR _pack_unit IS NULL) THEN
        RAISE EXCEPTION 'Row %: pack info missing (use no_pack_required=true for packless items)', _row.row_number;
      END IF;

      INSERT INTO public.product_variants(
        product_id, pack_value, pack_unit_code, pack_label, is_packless,
        erp_stock_id, availability, status, archived, created_by
      ) VALUES (
        _family_id, _pack_value, _pack_unit, _pack_label, _is_packless,
        NULLIF(_payload->>'erp_stock_id',''),
        'check', 'draft', false, _uid
      ) RETURNING id, updated_at INTO _variant_id, _u;

      _tables := _tables || 'product_variants'; _ids := _ids || _variant_id;
      _updated_at_map := _updated_at_map || jsonb_build_object(_variant_id::text, to_jsonb(_u));
      _last_updated_at := _u;
      _added_variants := _added_variants + 1;
    END IF;

    _after := jsonb_build_object(
      'brand_id', _brand_id, 'brand_created', _brand_created,
      'family_id', _family_id, 'variant_id', _variant_id,
      'tables', to_jsonb(_tables), 'ids', to_jsonb(_ids),
      'updated_ats', _updated_at_map
    );

    UPDATE public.import_batch_rows
    SET status='ok',
        action = CASE WHEN _payload->>'action' = 'update_variant' THEN 'update'::import_row_action
                      ELSE 'insert'::import_row_action END,
        target_table = CASE WHEN _payload->>'action' = 'update_variant' THEN 'products' ELSE 'product_variants' END,
        target_id = CASE WHEN _payload->>'action' = 'update_variant' THEN _family_id ELSE _variant_id END,
        target_updated_at_after_import = _last_updated_at,
        before_snapshot = _before,
        after_snapshot = _after
    WHERE id=_row.id;
  END LOOP;

  UPDATE public.import_batches SET
    status='succeeded',
    committed_at=now(),
    rollback_expires_at=now() + interval '7 days',
    totals = jsonb_build_object(
      'created_families', _created_families,
      'added_variants',   _added_variants,
      'updated_variants', _updated_variants,
      'skipped',          _skipped,
      'failed',           _failed
    )
  WHERE id=_batch_id;

  RETURN jsonb_build_object(
    'ok', true,
    'created_families', _created_families,
    'added_variants',   _added_variants,
    'updated_variants', _updated_variants,
    'skipped',          _skipped,
    'failed',           _failed
  );
END $function$;

-- ============================================================
-- 3) CATALOGUE ROLLBACK — exact per-target updated_at check.
--    Any modified target -> rollback_skipped_modified, leave record intact.
-- ============================================================
-- Extend the row-status vocabulary
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_row_status') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.import_row_status'::regtype AND enumlabel = 'rollback_skipped_modified') THEN
      ALTER TYPE public.import_row_status ADD VALUE 'rollback_skipped_modified';
    END IF;
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- status column is plain text; nothing to do.
  NULL;
END $$;

CREATE OR REPLACE FUNCTION public.rollback_catalogue_import_batch(_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _batch RECORD;
  _row RECORD;
  _snap jsonb;
  _before jsonb;
  _tables text[];
  _ids uuid[];
  _updated_ats jsonb;
  _i int;
  _tbl text;
  _id uuid;
  _cur_upd timestamptz;
  _expected timestamptz;
  _reverted int := 0;
  _skipped_rb int := 0;
  _skipped_modified int := 0;
  _failed_rb int := 0;
  _refcount int;
BEGIN
  IF NOT public.is_admin(_uid) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='insufficient_privilege'; END IF;

  SELECT * INTO _batch FROM public.import_batches WHERE id=_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF _batch.kind <> 'catalogue' THEN RAISE EXCEPTION 'Wrong batch kind'; END IF;
  IF _batch.status NOT IN ('succeeded','partially_rolled_back') THEN
    RAISE EXCEPTION 'Cannot rollback batch in status %', _batch.status;
  END IF;
  IF _batch.rollback_expires_at IS NULL OR _batch.rollback_expires_at < now() THEN
    RAISE EXCEPTION 'Rollback window expired';
  END IF;

  UPDATE public.import_batches SET status='rollback_in_progress' WHERE id=_batch_id;

  FOR _row IN
    SELECT * FROM public.import_batch_rows
    WHERE batch_id=_batch_id AND status='ok'
    ORDER BY row_number DESC
  LOOP
    _snap := _row.after_snapshot;
    _before := _row.before_snapshot;
    IF _snap IS NULL OR NOT (_snap ? 'tables') THEN
      UPDATE public.import_batch_rows SET status='rollback_skipped' WHERE id=_row.id;
      _skipped_rb := _skipped_rb + 1;
      CONTINUE;
    END IF;

    _tables := ARRAY(SELECT jsonb_array_elements_text(_snap->'tables'));
    _ids    := ARRAY(SELECT (jsonb_array_elements_text(_snap->'ids'))::uuid);
    _updated_ats := COALESCE(_snap->'updated_ats', '{}'::jsonb);

    BEGIN
      FOR _i IN REVERSE array_length(_tables,1) .. 1 LOOP
        _tbl := _tables[_i]; _id := _ids[_i];
        _expected := NULLIF(_updated_ats->>(_id::text),'')::timestamptz;

        IF _tbl = 'product_variants' THEN
          SELECT updated_at INTO _cur_upd FROM public.product_variants WHERE id=_id;
          IF _cur_upd IS NULL THEN CONTINUE; END IF;
          IF _expected IS NULL OR _cur_upd IS DISTINCT FROM _expected THEN
            RAISE EXCEPTION 'MODIFIED: variant %', _id;
          END IF;
          DELETE FROM public.product_variants WHERE id=_id;

        ELSIF _tbl = 'products' THEN
          SELECT updated_at INTO _cur_upd FROM public.products WHERE id=_id;
          IF _cur_upd IS NULL THEN CONTINUE; END IF;
          IF _expected IS NULL OR _cur_upd IS DISTINCT FROM _expected THEN
            RAISE EXCEPTION 'MODIFIED: product %', _id;
          END IF;
          SELECT count(*) INTO _refcount FROM public.product_variants WHERE product_id=_id;
          IF _refcount > 0 THEN
            RAISE EXCEPTION 'REFERENCED: product % has remaining variants', _id;
          END IF;
          DELETE FROM public.products WHERE id=_id;

        ELSIF _tbl = 'products.update' THEN
          SELECT updated_at INTO _cur_upd FROM public.products WHERE id=_id;
          IF _cur_upd IS NULL THEN CONTINUE; END IF;
          IF _expected IS NULL OR _cur_upd IS DISTINCT FROM _expected THEN
            RAISE EXCEPTION 'MODIFIED: product % (update)', _id;
          END IF;
          UPDATE public.products
          SET erp_description = _before->'products'->>'erp_description',
              updated_at = now()
          WHERE id=_id;

        ELSIF _tbl = 'brands' THEN
          SELECT updated_at INTO _cur_upd FROM public.brands WHERE id=_id;
          IF _cur_upd IS NULL THEN CONTINUE; END IF;
          IF _expected IS NULL OR _cur_upd IS DISTINCT FROM _expected THEN
            RAISE EXCEPTION 'MODIFIED: brand %', _id;
          END IF;
          SELECT count(*) INTO _refcount FROM public.products WHERE brand_id=_id;
          IF _refcount > 0 THEN RAISE EXCEPTION 'REFERENCED: brand % still used by products', _id; END IF;
          SELECT count(*) INTO _refcount FROM public.tyre_models WHERE brand_id=_id;
          IF _refcount > 0 THEN RAISE EXCEPTION 'REFERENCED: brand % still used by tyre models', _id; END IF;
          DELETE FROM public.brands WHERE id=_id;
        END IF;
      END LOOP;

      UPDATE public.import_batch_rows SET status='rolled_back' WHERE id=_row.id;
      _reverted := _reverted + 1;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE 'MODIFIED:%' THEN
        UPDATE public.import_batch_rows
          SET status='rollback_skipped', error_message='rollback_skipped_modified: ' || SQLERRM
          WHERE id=_row.id;
        _skipped_modified := _skipped_modified + 1;
      ELSE
        UPDATE public.import_batch_rows
          SET status='rollback_skipped', error_message=SQLERRM
          WHERE id=_row.id;
        _skipped_rb := _skipped_rb + 1;
      END IF;
    END;
  END LOOP;

  UPDATE public.import_batches SET
    status = CASE WHEN _skipped_rb=0 AND _skipped_modified=0 AND _failed_rb=0 THEN 'rolled_back'::import_batch_status
                  ELSE 'partially_rolled_back'::import_batch_status END,
    rolled_back_at = now()
  WHERE id=_batch_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reverted', _reverted,
    'skipped', _skipped_rb,
    'skipped_modified', _skipped_modified,
    'failed', _failed_rb
  );
END $function$;

-- ============================================================
-- 4) VEHICLE ROLLBACK — same exact-updated_at rule (no 2s window).
-- ============================================================
CREATE OR REPLACE FUNCTION public.rollback_vehicle_import_batch(_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _batch RECORD;
  _row RECORD;
  _snap jsonb;
  _tables text[];
  _ids uuid[];
  _i int;
  _tbl text;
  _id uuid;
  _cur_upd timestamptz;
  _reverted int := 0;
  _skipped_rb int := 0;
  _skipped_modified int := 0;
  _failed_rb int := 0;
  _allow text[] := ARRAY['vehicle_makes','vehicle_models','vehicle_configurations','vehicle_oem_tyre_specs','vehicle_oem_oil_specs'];
BEGIN
  IF NOT public.is_admin(_uid) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='insufficient_privilege'; END IF;

  SELECT * INTO _batch FROM public.import_batches WHERE id=_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF _batch.status NOT IN ('succeeded','partially_rolled_back') THEN
    RAISE EXCEPTION 'Cannot rollback batch in status %', _batch.status;
  END IF;
  IF _batch.rollback_expires_at IS NULL OR _batch.rollback_expires_at < now() THEN
    RAISE EXCEPTION 'Rollback window expired';
  END IF;

  UPDATE public.import_batches SET status='rollback_in_progress' WHERE id=_batch_id;

  FOR _row IN
    SELECT * FROM public.import_batch_rows
    WHERE batch_id=_batch_id AND status='ok'
    ORDER BY row_number DESC
  LOOP
    _snap := _row.after_snapshot;
    IF _snap IS NULL OR NOT (_snap ? 'tables') THEN
      UPDATE public.import_batch_rows SET status='rollback_skipped' WHERE id=_row.id;
      _skipped_rb := _skipped_rb + 1;
      CONTINUE;
    END IF;

    _tables := ARRAY(SELECT jsonb_array_elements_text(_snap->'tables'));
    _ids := ARRAY(SELECT (jsonb_array_elements_text(_snap->'ids'))::uuid);

    BEGIN
      FOR _i IN REVERSE array_length(_tables,1) .. 1 LOOP
        _tbl := _tables[_i]; _id := _ids[_i];
        IF NOT (_tbl = ANY(_allow)) THEN CONTINUE; END IF;

        EXECUTE format('SELECT updated_at FROM public.%I WHERE id=$1', _tbl)
          INTO _cur_upd USING _id;
        IF _cur_upd IS NULL THEN CONTINUE; END IF;
        IF _row.target_updated_at_after_import IS NULL
           OR _cur_upd IS DISTINCT FROM _row.target_updated_at_after_import THEN
          RAISE EXCEPTION 'MODIFIED: % %', _tbl, _id;
        END IF;

        EXECUTE format('DELETE FROM public.%I WHERE id=$1', _tbl) USING _id;
      END LOOP;

      UPDATE public.import_batch_rows SET status='rolled_back' WHERE id=_row.id;
      _reverted := _reverted + 1;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE 'MODIFIED:%' THEN
        UPDATE public.import_batch_rows
          SET status='rollback_skipped', error_message='rollback_skipped_modified: ' || SQLERRM
          WHERE id=_row.id;
        _skipped_modified := _skipped_modified + 1;
      ELSE
        UPDATE public.import_batch_rows
          SET status='rollback_skipped', error_message=SQLERRM
          WHERE id=_row.id;
        _skipped_rb := _skipped_rb + 1;
      END IF;
    END;
  END LOOP;

  UPDATE public.import_batches SET
    status = CASE WHEN _skipped_rb=0 AND _skipped_modified=0 AND _failed_rb=0 THEN 'rolled_back'::import_batch_status
                  ELSE 'partially_rolled_back'::import_batch_status END,
    rolled_back_at = now()
  WHERE id=_batch_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reverted', _reverted,
    'skipped', _skipped_rb,
    'skipped_modified', _skipped_modified,
    'failed', _failed_rb
  );
END $function$;
