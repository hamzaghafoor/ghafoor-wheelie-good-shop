
ALTER TABLE public.vehicle_configurations ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.vehicle_oem_tyre_specs ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.vehicle_oem_oil_specs ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS vc_archived_idx ON public.vehicle_configurations (archived) WHERE archived = false;
CREATE INDEX IF NOT EXISTS vts_archived_idx ON public.vehicle_oem_tyre_specs (archived) WHERE archived = false;
CREATE INDEX IF NOT EXISTS vos_archived_idx ON public.vehicle_oem_oil_specs (archived) WHERE archived = false;

CREATE OR REPLACE FUNCTION public.get_vehicle_configurations(_model_id uuid)
 RETURNS TABLE(id uuid, trim_name text, engine_code text, engine_name text, chassis_code text, engine_capacity_cc integer, fuel_type text, transmission text, drivetrain text, body_type text, market text, production_year_from integer, production_year_to integer, pk_year_from integer, pk_year_to integer, verification_status text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
  SELECT c.id, c.trim_name, c.engine_code, c.engine_name, c.chassis_code,
         c.engine_capacity_cc, c.fuel_type::text, c.transmission, c.drivetrain, c.body_type,
         c.market::text, c.production_year_from, c.production_year_to,
         c.pk_year_from, c.pk_year_to, c.verification_status::text
  FROM public.vehicle_configurations c
  WHERE c.model_id = _model_id
    AND c.archived = false
    AND c.verification_status <> 'disputed'
  ORDER BY
    CASE WHEN c.market = 'PK' THEN 0 ELSE 1 END,
    CASE c.verification_status WHEN 'verified' THEN 0 WHEN 'partial' THEN 1 ELSE 2 END,
    COALESCE(c.pk_year_from, c.production_year_from) DESC NULLS LAST,
    c.trim_name;
$function$;

CREATE OR REPLACE FUNCTION public.get_vehicle_oem_tyre_specs(_configuration_id uuid)
 RETURNS TABLE(id uuid, layout text, front_width integer, front_profile integer, front_rim integer, front_load_index integer, front_speed_rating text, rear_width integer, rear_profile integer, rear_rim integer, rear_load_index integer, rear_speed_rating text, front_size_label text, rear_size_label text, is_primary boolean, verification_status text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
  SELECT s.id, s.layout::text,
         s.front_width, s.front_profile, s.front_rim, s.front_load_index, s.front_speed_rating,
         s.rear_width, s.rear_profile, s.rear_rim, s.rear_load_index, s.rear_speed_rating,
         s.front_size_label, s.rear_size_label,
         s.is_primary, s.verification_status::text
  FROM public.vehicle_oem_tyre_specs s
  WHERE s.configuration_id = _configuration_id
    AND s.archived = false
    AND s.verification_status <> 'disputed'
  ORDER BY
    s.is_primary DESC,
    CASE s.verification_status WHEN 'verified' THEN 0 WHEN 'partial' THEN 1 WHEN 'disputed' THEN 2 ELSE 3 END,
    s.updated_at DESC, s.id;
$function$;

CREATE OR REPLACE FUNCTION public.get_vehicle_oem_oil_specs(_configuration_id uuid)
 RETURNS TABLE(id uuid, sae_grade text, api_standard text, acea_standard text, ilsac_standard text, jaso_standard text, oem_approvals text[], capacity_with_filter_l numeric, capacity_without_filter_l numeric, change_interval_km integer, change_interval_months integer, is_primary boolean, verification_status text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
  SELECT o.id, o.sae_grade, o.api_standard, o.acea_standard, o.ilsac_standard, o.jaso_standard,
         o.oem_approvals, o.capacity_with_filter_l, o.capacity_without_filter_l,
         o.change_interval_km, o.change_interval_months,
         o.is_primary, o.verification_status::text
  FROM public.vehicle_oem_oil_specs o
  WHERE o.configuration_id = _configuration_id
    AND o.archived = false
    AND o.verification_status <> 'disputed'
  ORDER BY
    o.is_primary DESC,
    CASE o.verification_status WHEN 'verified' THEN 0 WHEN 'partial' THEN 1 WHEN 'disputed' THEN 2 ELSE 3 END,
    o.updated_at DESC, o.id;
$function$;
