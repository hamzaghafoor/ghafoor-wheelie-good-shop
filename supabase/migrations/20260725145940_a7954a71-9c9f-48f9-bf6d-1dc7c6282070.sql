
-- Expose imported (needs_verification) vehicle configurations and OEM tyre specs
-- to the public finder. Exclude only 'disputed'. This matches the current data
-- state where admin-imported specs are pending verification but are safe to show
-- with a "pending verification" indicator on the client.

CREATE OR REPLACE FUNCTION public.get_public_vehicle_configurations(_model_id uuid, _year integer DEFAULT NULL::integer)
 RETURNS TABLE(id uuid, trim_name text, engine_name text, engine_capacity_cc integer, fuel_type text, transmission text, drivetrain text, body_type text, market text, pk_year_from integer, pk_year_to integer, production_year_from integer, production_year_to integer, verification_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT c.id, c.trim_name, c.engine_name, c.engine_capacity_cc,
         c.fuel_type::text, c.transmission, c.drivetrain, c.body_type,
         c.market::text,
         c.pk_year_from, c.pk_year_to,
         c.production_year_from, c.production_year_to,
         c.verification_status::text
  FROM public.vehicle_configurations c
  JOIN public.vehicle_models vm ON vm.id = c.model_id
  JOIN public.vehicle_makes  mk ON mk.id = vm.make_id
  WHERE c.model_id = _model_id
    AND c.archived = false
    AND c.verification_status <> 'disputed'::public.spec_verification_status
    AND vm.is_active = true AND vm.archived = false
    AND mk.is_active = true AND mk.archived = false
    AND (
      _year IS NULL
      OR (c.pk_year_from IS NOT NULL AND _year >= c.pk_year_from AND (c.pk_year_to IS NULL OR _year <= c.pk_year_to))
      OR (c.pk_year_from IS NULL AND c.production_year_from IS NOT NULL
          AND _year >= c.production_year_from AND (c.production_year_to IS NULL OR _year <= c.production_year_to))
    )
  ORDER BY
    CASE WHEN c.market = 'PK'::public.market_type THEN 0 ELSE 1 END,
    CASE c.verification_status
      WHEN 'verified'::public.spec_verification_status THEN 0
      WHEN 'partial'::public.spec_verification_status THEN 1
      ELSE 2 END,
    COALESCE(c.pk_year_from, c.production_year_from) DESC NULLS LAST,
    c.trim_name NULLS LAST,
    c.id;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_vehicle_oem_tyre_sizes(_configuration_id uuid)
 RETURNS TABLE(id uuid, layout text, front_width integer, front_profile integer, front_rim integer, front_load_index integer, front_speed_rating text, rear_width integer, rear_profile integer, rear_rim integer, rear_load_index integer, rear_speed_rating text, is_primary boolean, verification_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT s.id, s.layout::text,
         s.front_width, s.front_profile, s.front_rim,
         s.front_load_index, s.front_speed_rating,
         s.rear_width, s.rear_profile, s.rear_rim,
         s.rear_load_index, s.rear_speed_rating,
         s.is_primary, s.verification_status::text
  FROM public.vehicle_oem_tyre_specs s
  JOIN public.vehicle_configurations c ON c.id = s.configuration_id
  JOIN public.vehicle_models vm ON vm.id = c.model_id
  JOIN public.vehicle_makes  mk ON mk.id = vm.make_id
  WHERE s.configuration_id = _configuration_id
    AND s.archived = false
    AND s.verification_status <> 'disputed'::public.spec_verification_status
    AND c.archived = false
    AND c.verification_status <> 'disputed'::public.spec_verification_status
    AND vm.is_active = true AND vm.archived = false
    AND mk.is_active = true AND mk.archived = false
  ORDER BY s.is_primary DESC,
           CASE s.verification_status
             WHEN 'verified'::public.spec_verification_status THEN 0
             WHEN 'partial'::public.spec_verification_status THEN 1
             ELSE 2 END,
           s.id;
$function$;
