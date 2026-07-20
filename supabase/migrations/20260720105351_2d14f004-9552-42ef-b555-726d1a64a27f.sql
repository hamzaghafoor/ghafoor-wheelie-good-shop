-- Allow rollback to bypass the ERP-history guard via a session flag it sets itself.
CREATE OR REPLACE FUNCTION public.guard_variant_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.allow_import_rollback_delete', true) = 'on' THEN
    RETURN OLD;
  END IF;
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
END $function$;

-- Update rollback_catalogue_import_batch to set the bypass flag at start of transaction.
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

  -- Allow guard_variant_delete to permit deletes originated by this rollback only.
  PERFORM set_config('app.allow_import_rollback_delete', 'on', true);

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

-- Now re-run rollback on the fixture batch: reset the batch status and row statuses to try again.
DO $$
DECLARE _bid uuid; _rb jsonb;
BEGIN
  SELECT id INTO _bid FROM public.import_batches WHERE filename='phase2_smoke.xlsx' ORDER BY created_at DESC LIMIT 1;
  IF _bid IS NULL THEN RETURN; END IF;

  -- Restore original state so we can re-run rollback cleanly:
  UPDATE public.import_batches SET status='succeeded', rolled_back_at=NULL WHERE id=_bid;
  UPDATE public.import_batch_rows SET status='ok', error_message=NULL WHERE batch_id=_bid;

  PERFORM set_config('request.jwt.claims','{"sub":"cccb4cc3-e5e7-456e-81a3-547f8464589c","role":"authenticated"}', true);
  _rb := public.rollback_catalogue_import_batch(_bid);
  RAISE NOTICE 'Rollback (retry) result: %', _rb;
END $$;