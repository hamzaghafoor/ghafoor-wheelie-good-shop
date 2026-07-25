-- Restrict public read on compatibility tables to published/non-archived referenced entities
DROP POLICY IF EXISTS pvc_public_read ON public.product_vehicle_compat;
DROP POLICY IF EXISTS pvc_auth_read ON public.product_vehicle_compat;
CREATE POLICY pvc_public_read ON public.product_vehicle_compat
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p
          WHERE p.id = product_vehicle_compat.product_id
            AND p.status = 'published' AND p.archived = false)
);

DROP POLICY IF EXISTS tmvc_public_read ON public.tyre_model_vehicle_compat;
DROP POLICY IF EXISTS tmvc_auth_read ON public.tyre_model_vehicle_compat;
CREATE POLICY tmvc_public_read ON public.tyre_model_vehicle_compat
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tyre_models m
          WHERE m.id = tyre_model_vehicle_compat.tyre_model_id
            AND m.status = 'published' AND m.archived = false)
);

DROP POLICY IF EXISTS tvvc_public_read ON public.tyre_variant_vehicle_compat;
CREATE POLICY tvvc_public_read ON public.tyre_variant_vehicle_compat
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tyre_variants v
          JOIN public.tyre_models m ON m.id = v.model_id
          WHERE v.id = tyre_variant_vehicle_compat.variant_id
            AND v.status = 'published' AND v.archived = false
            AND m.status = 'published' AND m.archived = false)
);

-- Restrict public fitments to approved + confirmed rows referencing a published product/variant
DROP POLICY IF EXISTS "Fitments are readable by anyone" ON public.vehicle_fitments;
CREATE POLICY "Fitments are readable by anyone" ON public.vehicle_fitments
FOR SELECT USING (
  approved = true
  AND status IN ('verified','commonly_used')
  AND (
    (product_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.products p
       WHERE p.id = vehicle_fitments.product_id
         AND p.status = 'published' AND p.archived = false))
    OR
    (variant_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.product_variants pv
       JOIN public.products p ON p.id = pv.product_id
       WHERE pv.id = vehicle_fitments.variant_id
         AND pv.status = 'published' AND pv.archived = false
         AND p.status = 'published' AND p.archived = false))
  )
);
