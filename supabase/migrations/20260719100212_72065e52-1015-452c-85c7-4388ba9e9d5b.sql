
-- Vehicle OEM CSV Importer: apply / rollback / purge RPCs
-- Reuses import_batches and import_batch_rows.
-- source_payload shape produced by server function preview:
-- {
--   make: { id?: uuid, name: text, create: bool },
--   model: { id?: uuid, name: text, body_type?: text, create: bool },
--   config: { <vehicle_configurations columns>, existing_id?: uuid, conflict_action: 'insert'|'update'|'skip' },
--   tyre?:  { <vehicle_oem_tyre_specs columns without configuration_id> },
--   oil?:   { <vehicle_oem_oil_specs columns without configuration_id> }
-- }

CREATE OR REPLACE FUNCTION public.apply_vehicle_import_batch(_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _batch RECORD;
  _row RECORD;
  _payload jsonb;
  _make_id uuid;
  _model_id uuid;
  _config_id uuid;
  _tyre_id uuid;
  _oil_id uuid;
  _make_name text;
  _model_name text;
  _created int := 0;
  _updated int := 0;
  _skipped int := 0;
  _failed  int := 0;
  _after jsonb;
  _tables text[];
  _ids uuid[];
  _err text;
BEGIN
  IF NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO _batch FROM public.import_batches WHERE id = _batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF _batch.status <> 'previewed' THEN
    RAISE EXCEPTION 'Batch must be in previewed state (is %)', _batch.status;
  END IF;
  IF _batch.kind <> 'vehicle_spec' THEN
    RAISE EXCEPTION 'Wrong batch kind';
  END IF;

  UPDATE public.import_batches SET status='committing' WHERE id=_batch_id;

  -- If allow_partial=false, any error in loop RAISEs → transaction rollback.
  FOR _row IN
    SELECT * FROM public.import_batch_rows
    WHERE batch_id=_batch_id AND status='pending'
    ORDER BY row_number
  LOOP
    BEGIN
      _payload := _row.source_payload;
      _tables := ARRAY[]::text[];
      _ids := ARRAY[]::uuid[];
      _after := '{}'::jsonb;

      IF (_payload->>'action') = 'skip' THEN
        UPDATE public.import_batch_rows SET status='skipped', action='skip' WHERE id=_row.id;
        _skipped := _skipped + 1;
        CONTINUE;
      END IF;

      -- Make
      _make_name := btrim(_payload->'make'->>'name');
      IF (_payload->'make'->>'id') IS NOT NULL AND (_payload->'make'->>'id') <> '' THEN
        _make_id := (_payload->'make'->>'id')::uuid;
      ELSE
        SELECT id INTO _make_id FROM public.vehicle_makes WHERE lower(name)=lower(_make_name) AND archived=false LIMIT 1;
        IF _make_id IS NULL THEN
          INSERT INTO public.vehicle_makes(name, slug, created_by)
          VALUES (_make_name, lower(regexp_replace(_make_name,'[^a-zA-Z0-9]+','-','g')), _uid)
          RETURNING id INTO _make_id;
          _tables := _tables || 'vehicle_makes'; _ids := _ids || _make_id;
        END IF;
      END IF;

      -- Model
      _model_name := btrim(_payload->'model'->>'name');
      IF (_payload->'model'->>'id') IS NOT NULL AND (_payload->'model'->>'id') <> '' THEN
        _model_id := (_payload->'model'->>'id')::uuid;
      ELSE
        SELECT id INTO _model_id FROM public.vehicle_models
        WHERE make_id=_make_id AND lower(name)=lower(_model_name) AND archived=false LIMIT 1;
        IF _model_id IS NULL THEN
          INSERT INTO public.vehicle_models(make_id, name, slug, body_type, created_by)
          VALUES (_make_id, _model_name,
                  lower(regexp_replace(_model_name,'[^a-zA-Z0-9]+','-','g')),
                  COALESCE(NULLIF(_payload->'model'->>'body_type','')::vehicle_body_type,'sedan'::vehicle_body_type),
                  _uid)
          RETURNING id INTO _model_id;
          _tables := _tables || 'vehicle_models'; _ids := _ids || _model_id;
        END IF;
      END IF;

      -- Configuration
      IF (_payload->'config'->>'existing_id') IS NOT NULL AND (_payload->'config'->>'existing_id') <> '' THEN
        _config_id := (_payload->'config'->>'existing_id')::uuid;
        IF (_payload->'config'->>'conflict_action') = 'skip' THEN
          -- reuse; do not update
          NULL;
        ELSIF (_payload->'config'->>'conflict_action') = 'update' THEN
          UPDATE public.vehicle_configurations SET
            trim_name = COALESCE(NULLIF(_payload->'config'->>'trim_name',''), trim_name),
            engine_code = COALESCE(NULLIF(_payload->'config'->>'engine_code',''), engine_code),
            engine_name = COALESCE(NULLIF(_payload->'config'->>'engine_name',''), engine_name),
            chassis_code = COALESCE(NULLIF(_payload->'config'->>'chassis_code',''), chassis_code),
            engine_capacity_cc = COALESCE((_payload->'config'->>'engine_capacity_cc')::int, engine_capacity_cc),
            fuel_type = COALESCE(NULLIF(_payload->'config'->>'fuel_type','')::fuel_type, fuel_type),
            body_type = COALESCE(NULLIF(_payload->'config'->>'body_type',''), body_type),
            market = COALESCE(NULLIF(_payload->'config'->>'market','')::market_type, market),
            production_year_from = COALESCE((_payload->'config'->>'production_year_from')::int, production_year_from),
            production_year_to = COALESCE((_payload->'config'->>'production_year_to')::int, production_year_to),
            pk_year_from = COALESCE((_payload->'config'->>'pk_year_from')::int, pk_year_from),
            pk_year_to = COALESCE((_payload->'config'->>'pk_year_to')::int, pk_year_to),
            source_type = COALESCE(NULLIF(_payload->'config'->>'source_type','')::spec_source_type, source_type),
            source_url = COALESCE(NULLIF(_payload->'config'->>'source_url',''), source_url),
            updated_by = _uid
          WHERE id = _config_id;
        END IF;
      ELSE
        INSERT INTO public.vehicle_configurations(
          model_id, trim_name, engine_code, engine_name, chassis_code, engine_capacity_cc,
          fuel_type, body_type, market,
          production_year_from, production_year_to, pk_year_from, pk_year_to,
          source_type, source_url, source_notes,
          verification_status, created_by, updated_by
        ) VALUES (
          _model_id,
          NULLIF(_payload->'config'->>'trim_name',''),
          NULLIF(_payload->'config'->>'engine_code',''),
          NULLIF(_payload->'config'->>'engine_name',''),
          NULLIF(_payload->'config'->>'chassis_code',''),
          NULLIF(_payload->'config'->>'engine_capacity_cc','')::int,
          NULLIF(_payload->'config'->>'fuel_type','')::fuel_type,
          NULLIF(_payload->'config'->>'body_type',''),
          COALESCE(NULLIF(_payload->'config'->>'market','')::market_type,'PK'::market_type),
          NULLIF(_payload->'config'->>'production_year_from','')::int,
          NULLIF(_payload->'config'->>'production_year_to','')::int,
          NULLIF(_payload->'config'->>'pk_year_from','')::int,
          NULLIF(_payload->'config'->>'pk_year_to','')::int,
          NULLIF(_payload->'config'->>'source_type','')::spec_source_type,
          NULLIF(_payload->'config'->>'source_url',''),
          NULLIF(_payload->'config'->>'source_notes',''),
          'needs_verification'::spec_verification_status,
          _uid, _uid
        ) RETURNING id INTO _config_id;
        _tables := _tables || 'vehicle_configurations'; _ids := _ids || _config_id;
      END IF;

      -- Tyre spec
      IF _payload ? 'tyre' AND jsonb_typeof(_payload->'tyre') = 'object' THEN
        INSERT INTO public.vehicle_oem_tyre_specs(
          configuration_id, layout,
          front_width, front_profile, front_rim, front_load_index, front_speed_rating,
          rear_width, rear_profile, rear_rim, rear_load_index, rear_speed_rating,
          is_primary, verification_status, source_type, source_url, source_notes, created_by, updated_by
        ) VALUES (
          _config_id,
          COALESCE(NULLIF(_payload->'tyre'->>'layout','')::tyre_layout_type,'same'::tyre_layout_type),
          (_payload->'tyre'->>'front_width')::int,
          (_payload->'tyre'->>'front_profile')::int,
          (_payload->'tyre'->>'front_rim')::int,
          NULLIF(_payload->'tyre'->>'front_load_index','')::int,
          NULLIF(_payload->'tyre'->>'front_speed_rating',''),
          NULLIF(_payload->'tyre'->>'rear_width','')::int,
          NULLIF(_payload->'tyre'->>'rear_profile','')::int,
          NULLIF(_payload->'tyre'->>'rear_rim','')::int,
          NULLIF(_payload->'tyre'->>'rear_load_index','')::int,
          NULLIF(_payload->'tyre'->>'rear_speed_rating',''),
          false, 'needs_verification'::spec_verification_status,
          NULLIF(_payload->'tyre'->>'source_type','')::spec_source_type,
          NULLIF(_payload->'tyre'->>'source_url',''),
          NULLIF(_payload->'tyre'->>'source_notes',''),
          _uid, _uid
        ) RETURNING id INTO _tyre_id;
        _tables := _tables || 'vehicle_oem_tyre_specs'; _ids := _ids || _tyre_id;
      END IF;

      -- Oil spec
      IF _payload ? 'oil' AND jsonb_typeof(_payload->'oil') = 'object' THEN
        INSERT INTO public.vehicle_oem_oil_specs(
          configuration_id, sae_grade, api_standard, acea_standard, ilsac_standard, jaso_standard,
          oem_approvals, capacity_with_filter_l, capacity_without_filter_l,
          change_interval_km, change_interval_months,
          is_primary, verification_status, source_type, source_url, source_notes, created_by, updated_by
        ) VALUES (
          _config_id,
          _payload->'oil'->>'sae_grade',
          NULLIF(_payload->'oil'->>'api_standard',''),
          NULLIF(_payload->'oil'->>'acea_standard',''),
          NULLIF(_payload->'oil'->>'ilsac_standard',''),
          NULLIF(_payload->'oil'->>'jaso_standard',''),
          CASE WHEN _payload->'oil' ? 'oem_approvals' THEN
            ARRAY(SELECT jsonb_array_elements_text(_payload->'oil'->'oem_approvals'))
          ELSE NULL END,
          NULLIF(_payload->'oil'->>'capacity_with_filter_l','')::numeric,
          NULLIF(_payload->'oil'->>'capacity_without_filter_l','')::numeric,
          NULLIF(_payload->'oil'->>'change_interval_km','')::int,
          NULLIF(_payload->'oil'->>'change_interval_months','')::int,
          false, 'needs_verification'::spec_verification_status,
          NULLIF(_payload->'oil'->>'source_type','')::spec_source_type,
          NULLIF(_payload->'oil'->>'source_url',''),
          NULLIF(_payload->'oil'->>'source_notes',''),
          _uid, _uid
        ) RETURNING id INTO _oil_id;
        _tables := _tables || 'vehicle_oem_oil_specs'; _ids := _ids || _oil_id;
      END IF;

      _after := jsonb_build_object(
        'make_id', _make_id, 'model_id', _model_id, 'config_id', _config_id,
        'tyre_id', _tyre_id, 'oil_id', _oil_id,
        'tables', to_jsonb(_tables), 'ids', to_jsonb(_ids)
      );

      UPDATE public.import_batch_rows
      SET status='ok',
          action = CASE WHEN (_payload->'config'->>'conflict_action')='update' THEN 'update'::import_row_action ELSE 'insert'::import_row_action END,
          target_table = 'vehicle_configurations',
          target_id = _config_id,
          target_updated_at_after_import = now(),
          after_snapshot = _after
      WHERE id=_row.id;

      IF (_payload->'config'->>'conflict_action')='update' THEN _updated := _updated + 1;
      ELSE _created := _created + 1;
      END IF;
      _tyre_id := NULL; _oil_id := NULL;

    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS _err = MESSAGE_TEXT;
      IF NOT _batch.allow_partial THEN
        RAISE EXCEPTION 'Row % failed: %', _row.row_number, _err;
      END IF;
      UPDATE public.import_batch_rows
        SET status='error', action='error', error_message=_err
        WHERE id=_row.id;
      _failed := _failed + 1;
    END;
  END LOOP;

  UPDATE public.import_batches SET
    status='succeeded',
    committed_at=now(),
    rollback_expires_at=now() + interval '7 days',
    totals = jsonb_build_object('created',_created,'updated',_updated,'skipped',_skipped,'failed',_failed)
  WHERE id=_batch_id;

  RETURN jsonb_build_object('ok',true,'created',_created,'updated',_updated,'skipped',_skipped,'failed',_failed);
END $$;

REVOKE ALL ON FUNCTION public.apply_vehicle_import_batch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_vehicle_import_batch(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.rollback_vehicle_import_batch(_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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
      -- Delete in reverse order (child specs before parents)
      FOR _i IN REVERSE array_length(_tables,1) .. 1 LOOP
        _tbl := _tables[_i]; _id := _ids[_i];
        IF NOT (_tbl = ANY(_allow)) THEN CONTINUE; END IF;

        -- Check target wasn't edited after import
        EXECUTE format('SELECT updated_at FROM public.%I WHERE id=$1', _tbl)
          INTO _cur_upd USING _id;
        IF _cur_upd IS NULL THEN CONTINUE; END IF;
        IF _row.target_updated_at_after_import IS NOT NULL
           AND _cur_upd > _row.target_updated_at_after_import + interval '2 seconds' THEN
          RAISE EXCEPTION 'Record % edited after import; skipping', _id;
        END IF;

        EXECUTE format('DELETE FROM public.%I WHERE id=$1', _tbl) USING _id;
      END LOOP;

      UPDATE public.import_batch_rows SET status='rolled_back' WHERE id=_row.id;
      _reverted := _reverted + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.import_batch_rows SET status='rollback_skipped', error_message=SQLERRM WHERE id=_row.id;
      _skipped_rb := _skipped_rb + 1;
    END;
  END LOOP;

  UPDATE public.import_batches SET
    status = CASE WHEN _skipped_rb=0 AND _failed_rb=0 THEN 'rolled_back'::import_batch_status
                  ELSE 'partially_rolled_back'::import_batch_status END,
    rolled_back_at = now()
  WHERE id=_batch_id;

  RETURN jsonb_build_object('ok',true,'reverted',_reverted,'skipped',_skipped_rb);
END $$;

REVOKE ALL ON FUNCTION public.rollback_vehicle_import_batch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollback_vehicle_import_batch(uuid) TO authenticated;


-- Purge raw source_payload older than 30 days
CREATE OR REPLACE FUNCTION public.purge_import_payloads()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE _n int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='insufficient_privilege'; END IF;
  UPDATE public.import_batch_rows
  SET source_payload = NULL, source_payload_purged_at = now()
  WHERE source_payload IS NOT NULL
    AND created_at < now() - interval '30 days';
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.purge_import_payloads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_import_payloads() TO authenticated;
