DO $$
DECLARE
  _batch_id uuid;
  _rb jsonb;
  _rows record;
BEGIN
  SELECT id INTO _batch_id FROM public.import_batches WHERE filename='phase2_smoke.xlsx' ORDER BY created_at DESC LIMIT 1;
  RAISE NOTICE 'Batch: %', _batch_id;

  -- Step 6: manually edit variant A1 to change updated_at
  UPDATE public.product_variants SET price = 1500 WHERE erp_stock_id='PH2-SMOKE-A1';
  RAISE NOTICE 'Edited PH2-SMOKE-A1';

  -- Step 7: run real rollback (must set jwt claim so is_admin passes)
  PERFORM set_config('request.jwt.claims','{"sub":"cccb4cc3-e5e7-456e-81a3-547f8464589c","role":"authenticated"}', true);
  _rb := public.rollback_catalogue_import_batch(_batch_id);
  RAISE NOTICE 'Rollback result: %', _rb;

  -- Step 8: report post-state
  FOR _rows IN
    SELECT erp_stock_id, price FROM public.product_variants WHERE erp_stock_id LIKE 'PH2-SMOKE-%' ORDER BY erp_stock_id
  LOOP
    RAISE NOTICE 'REMAINING variant: % price=%', _rows.erp_stock_id, _rows.price;
  END LOOP;

  FOR _rows IN
    SELECT name FROM public.products WHERE name IN ('SmokeOil 5W-30','SmokeFilter W204')
  LOOP
    RAISE NOTICE 'REMAINING product: %', _rows.name;
  END LOOP;

  FOR _rows IN
    SELECT name FROM public.brands WHERE name='PhaseTwoSmoke'
  LOOP
    RAISE NOTICE 'REMAINING brand: %', _rows.name;
  END LOOP;

  FOR _rows IN
    SELECT row_number, status, coalesce(error_message,'') AS msg FROM public.import_batch_rows WHERE batch_id=_batch_id ORDER BY row_number
  LOOP
    RAISE NOTICE 'ROW %: status=% msg=%', _rows.row_number, _rows.status, _rows.msg;
  END LOOP;
END $$;