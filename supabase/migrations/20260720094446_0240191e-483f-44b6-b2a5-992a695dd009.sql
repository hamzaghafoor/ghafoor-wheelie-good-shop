-- =========================================================================
-- Phase 2: catalogue ERP importer — commit and rollback RPCs
-- Vehicle importer RPCs are NOT modified.
-- Hard-coded table allowlist: brands, products, product_variants.
-- =========================================================================

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
  _added_variants  int := 0;
  _updated_variants int := 0;
  _skipped int := 0;
  _failed  int := 0;

  _brand_id uuid;
  _brand_key text;
  _brand_created boolean;
  _batch_brand_map jsonb := '{}'::jsonb;      -- batch_brand_key -> { id, created }
  _family_key text;
  _family_id uuid;
  _batch_family_map jsonb := '{}'::jsonb;      -- family_key -> product_id (within batch)
  _variant_id uuid;

  _pack_value numeric;
  _pack_unit text;
  _pack_label text;

  _tables text[];
  _ids uuid[];
  _before jsonb;
  _after jsonb;
  _err text;

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

  -- Revalidate: no included rows may be 'invalid' or 'needs_review'
  IF EXISTS (
    SELECT 1 FROM public.import_batch_rows r
    WHERE r.batch_id=_batch_id
      AND (r.source_payload->>'include')::boolean IS TRUE
      AND r.source_payload->>'action' IN ('invalid','needs_review')
  ) THEN
    RAISE EXCEPTION 'Batch contains unresolved invalid or needs_review rows';
  END IF;

  -- Revalidate: no duplicate stock IDs across included rows
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
    _before := '{}'::jsonb;
    _after := '{}'::jsonb;

    -- Non-included rows: mark skipped, continue
    IF NOT COALESCE((_payload->>'include')::boolean, false)
       OR _payload->>'action' IN ('skip','invalid','needs_review') THEN
      UPDATE public.import_batch_rows
      SET status='skipped', action='skip'
      WHERE id=_row.id;
      _skipped := _skipped + 1;
      CONTINUE;
    END IF;

    -- ---- Brand resolution -------------------------------------------------
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
      -- final safety: dedupe against existing name_normalized
      SELECT id INTO _brand_id
      FROM public.brands
      WHERE name_normalized = lower(regexp_replace(_new_name,'\s+','','g'))
        AND archived=false
      LIMIT 1;
      IF _brand_id IS NULL THEN
        _slug := lower(regexp_replace(_new_name,'[^a-zA-Z0-9]+','-','g'));
        _slug := regexp_replace(_slug,'(^-+)|(-+$)','','g');
        -- suffix if slug taken
        IF EXISTS (SELECT 1 FROM public.brands WHERE slug=_slug) THEN
          _slug := _slug || '-' || substr(md5(random()::text),1,6);
        END IF;
        INSERT INTO public.brands(name, slug, is_active, status, created_by)
        VALUES (_new_name, _slug, true, 'draft'::content_status, _uid)
        RETURNING id INTO _brand_id;
        _brand_created := true;
        _tables := ARRAY['brands']; _ids := ARRAY[_brand_id];
      END IF;
      IF _brand_key <> '' THEN
        _batch_brand_map := _batch_brand_map || jsonb_build_object(
          _brand_key, jsonb_build_object('id',_brand_id,'created',_brand_created)
        );
      END IF;
    ELSE
      RAISE EXCEPTION 'Row %: brand not confirmed', _row.row_number;
    END IF;

    -- ---- Product / family resolution -------------------------------------
    _family_id := NULL;
    _family_key := coalesce(_payload->'product'->>'family_key','');

    IF (_payload->'product'->>'product_id') IS NOT NULL
       AND (_payload->'product'->>'product_id') <> '' THEN
      _family_id := (_payload->'product'->>'product_id')::uuid;
    ELSIF _family_key <> '' AND _batch_family_map ? _family_key THEN
      _family_id := (_batch_family_map->>_family_key)::uuid;
    END IF;

    IF _family_id IS NULL THEN
      -- Create new family (Draft)
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
        erp_description, internal_notes,
        status, availability, archived, created_by
      ) VALUES (
        _prod_category, _brand_id, _new_name, _slug, _prod_type_id,
        COALESCE(
          (SELECT array_agg((x)::uuid) FROM jsonb_array_elements_text(_payload->'product'->'purpose_label_ids') x),
          '{}'::uuid[]
        ),
        NULLIF(_payload->'product'->>'erp_description',''),
        'Imported from ERP batch ' || _batch_id::text,
        'draft'::content_status,
        'check'::availability_status,
        false, _uid
      ) RETURNING id INTO _family_id;

      _tables := _tables || 'products'; _ids := _ids || _family_id;
      _created_families := _created_families + 1;

      IF _family_key <> '' THEN
        _batch_family_map := _batch_family_map || jsonb_build_object(_family_key, _family_id::text);
      END IF;
    END IF;

    -- ---- Variant --------------------------------------------------------
    _variant_id := NULLIF(_payload->'variant'->>'variant_id','')::uuid;

    -- Pack: honor "no_pack_required" sentinel -> 1 x pcs (schema requires pack_value>0)
    IF COALESCE((_payload->'variant'->>'no_pack_required')::boolean, false) THEN
      _pack_value := 1;
      _pack_unit := 'pcs';
      _pack_label := NULLIF(_payload->'variant'->>'pack_label','');
    ELSE
      _pack_value := NULLIF(_payload->'variant'->>'pack_value','')::numeric;
      _pack_unit := NULLIF(_payload->'variant'->>'pack_unit_code','');
      _pack_label := NULLIF(_payload->'variant'->>'pack_label','');
    END IF;

    IF _variant_id IS NOT NULL AND _payload->>'action' = 'update_variant' THEN
      -- Conservative update: only refresh the admin-only ERP description on the parent family.
      -- Never touches price, availability, images, public descriptions, publication status,
      -- or pack fields on the variant itself.
      SELECT jsonb_build_object(
        'products', jsonb_build_object('id',p.id,'erp_description',p.erp_description)
      ) INTO _before
      FROM public.products p WHERE p.id=_family_id;

      UPDATE public.products
      SET erp_description = COALESCE(NULLIF(_payload->'product'->>'erp_description',''), erp_description),
          updated_at = now()
      WHERE id=_family_id;

      _tables := _tables || 'products.update'; _ids := _ids || _family_id;
      _updated_variants := _updated_variants + 1;
    ELSE
      -- Insert new variant (Draft, availability=check)
      IF _pack_value IS NULL OR _pack_unit IS NULL THEN
        RAISE EXCEPTION 'Row %: pack info missing (use no_pack_required=true for packless items)', _row.row_number;
      END IF;

      INSERT INTO public.product_variants(
        product_id, pack_value, pack_unit_code, pack_label,
        erp_stock_id, availability, status, archived, created_by
      ) VALUES (
        _family_id, _pack_value, _pack_unit, _pack_label,
        NULLIF(_payload->>'erp_stock_id',''),
        'check',
        'draft',
        false, _uid
      ) RETURNING id INTO _variant_id;

      _tables := _tables || 'product_variants'; _ids := _ids || _variant_id;
      _added_variants := _added_variants + 1;
    END IF;

    _after := jsonb_build_object(
      'brand_id', _brand_id,
      'brand_created', _brand_created,
      'family_id', _family_id,
      'variant_id', _variant_id,
      'tables', to_jsonb(_tables),
      'ids', to_jsonb(_ids)
    );

    UPDATE public.import_batch_rows
    SET status='ok',
        action = CASE WHEN _payload->>'action' = 'update_variant' THEN 'update'::import_row_action
                      ELSE 'insert'::import_row_action END,
        target_table = CASE WHEN _payload->>'action' = 'update_variant' THEN 'products' ELSE 'product_variants' END,
        target_id = CASE WHEN _payload->>'action' = 'update_variant' THEN _family_id ELSE _variant_id END,
        target_updated_at_after_import = now(),
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

-- =========================================================================
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
  _i int;
  _tbl text;
  _id uuid;
  _cur_upd timestamptz;
  _reverted int := 0;
  _skipped_rb int := 0;
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

  -- Rows in reverse insertion order.
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

    BEGIN
      -- Reverse: variant -> product family -> brand
      FOR _i IN REVERSE array_length(_tables,1) .. 1 LOOP
        _tbl := _tables[_i]; _id := _ids[_i];

        IF _tbl = 'product_variants' THEN
          SELECT updated_at INTO _cur_upd FROM public.product_variants WHERE id=_id;
          IF _cur_upd IS NULL THEN CONTINUE; END IF;
          IF _row.target_updated_at_after_import IS NOT NULL
             AND _cur_upd > _row.target_updated_at_after_import + interval '2 seconds' THEN
            RAISE EXCEPTION 'Variant % modified after import', _id;
          END IF;
          DELETE FROM public.product_variants WHERE id=_id;

        ELSIF _tbl = 'products' THEN
          -- Only delete family if it has no OTHER variants (later/manual)
          SELECT updated_at INTO _cur_upd FROM public.products WHERE id=_id;
          IF _cur_upd IS NULL THEN CONTINUE; END IF;
          IF _row.target_updated_at_after_import IS NOT NULL
             AND _cur_upd > _row.target_updated_at_after_import + interval '2 seconds' THEN
            RAISE EXCEPTION 'Product family % modified after import', _id;
          END IF;
          SELECT count(*) INTO _refcount FROM public.product_variants WHERE product_id=_id;
          IF _refcount > 0 THEN
            RAISE EXCEPTION 'Product family % has remaining variants', _id;
          END IF;
          DELETE FROM public.products WHERE id=_id;

        ELSIF _tbl = 'products.update' THEN
          -- Restore ERP description if unchanged since import
          SELECT updated_at INTO _cur_upd FROM public.products WHERE id=_id;
          IF _cur_upd IS NULL THEN CONTINUE; END IF;
          IF _row.target_updated_at_after_import IS NOT NULL
             AND _cur_upd > _row.target_updated_at_after_import + interval '2 seconds' THEN
            RAISE EXCEPTION 'Product family % modified after import', _id;
          END IF;
          UPDATE public.products
          SET erp_description = _before->'products'->>'erp_description',
              updated_at = now()
          WHERE id=_id;

        ELSIF _tbl = 'brands' THEN
          -- Only delete if still unused
          SELECT count(*) INTO _refcount FROM public.products WHERE brand_id=_id;
          IF _refcount > 0 THEN
            RAISE EXCEPTION 'Brand % still referenced', _id;
          END IF;
          SELECT count(*) INTO _refcount FROM public.tyre_models WHERE brand_id=_id;
          IF _refcount > 0 THEN
            RAISE EXCEPTION 'Brand % still referenced by tyre models', _id;
          END IF;
          DELETE FROM public.brands WHERE id=_id;
        END IF;
      END LOOP;

      UPDATE public.import_batch_rows SET status='rolled_back' WHERE id=_row.id;
      _reverted := _reverted + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.import_batch_rows
      SET status='rollback_skipped', error_message=SQLERRM
      WHERE id=_row.id;
      _skipped_rb := _skipped_rb + 1;
    END;
  END LOOP;

  UPDATE public.import_batches SET
    status = CASE WHEN _skipped_rb=0 AND _failed_rb=0 THEN 'rolled_back'::import_batch_status
                  ELSE 'partially_rolled_back'::import_batch_status END,
    rolled_back_at = now()
  WHERE id=_batch_id;

  RETURN jsonb_build_object('ok',true,'reverted',_reverted,'skipped',_skipped_rb,'failed',_failed_rb);
END $function$;

REVOKE ALL ON FUNCTION public.apply_catalogue_import_batch(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rollback_catalogue_import_batch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_catalogue_import_batch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_catalogue_import_batch(uuid) TO authenticated;
