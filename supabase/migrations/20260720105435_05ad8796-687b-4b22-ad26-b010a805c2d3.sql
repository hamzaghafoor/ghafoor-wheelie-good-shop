DO $$
DECLARE _bid uuid;
BEGIN
  SELECT id INTO _bid FROM public.import_batches WHERE filename='phase2_smoke.xlsx' ORDER BY created_at DESC LIMIT 1;

  PERFORM set_config('app.allow_import_rollback_delete','on', true);
  DELETE FROM public.product_variants WHERE erp_stock_id LIKE 'PH2-SMOKE-%';
  DELETE FROM public.products WHERE name IN ('SmokeOil 5W-30','SmokeFilter W204');
  DELETE FROM public.brands WHERE name='PhaseTwoSmoke';
  IF _bid IS NOT NULL THEN
    DELETE FROM public.import_batch_rows WHERE batch_id=_bid;
    DELETE FROM public.import_batches WHERE id=_bid;
  END IF;
END $$;