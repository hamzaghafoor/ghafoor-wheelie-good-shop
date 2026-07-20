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
        _tables := ARRAY['brands']::text[]; _ids := ARRAY[_brand_id]::uuid[];
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

      _tables := array_append(_tables, 'products'); _ids := array_append(_ids, _family_id);
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
      SELECT jsonb_build_object('products', jsonb_build_object('id',p.id,'erp_description',p.erp_description))
        INTO _before FROM public.products p WHERE p.id=_family_id;

      UPDATE public.products
      SET erp_description = COALESCE(NULLIF(_payload->'product'->>'erp_description',''), erp_description),
          updated_at = now()
      WHERE id=_family_id
      RETURNING updated_at INTO _u;

      _tables := array_append(_tables, 'products.update'); _ids := array_append(_ids, _family_id);
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

      _tables := array_append(_tables, 'product_variants'); _ids := array_append(_ids, _variant_id);
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