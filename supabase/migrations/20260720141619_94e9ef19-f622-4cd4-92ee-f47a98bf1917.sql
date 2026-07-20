
-- Indexes for size search and vehicle compat
CREATE INDEX IF NOT EXISTS tv_size_pub_idx
  ON public.tyre_variants(width, profile, rim)
  WHERE status = 'published' AND archived = false
        AND width IS NOT NULL AND profile IS NOT NULL AND rim IS NOT NULL;

CREATE INDEX IF NOT EXISTS tvvc_model_year_idx
  ON public.tyre_variant_vehicle_compat(model_id, year_id);

-- 1) Tyre widths (from published inventory)
CREATE OR REPLACE FUNCTION public.get_public_tyre_widths()
RETURNS TABLE(width integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT DISTINCT v.width
  FROM public.tyre_variants v
  JOIN public.tyre_models  m ON m.id = v.model_id
  JOIN public.brands       b ON b.id = m.brand_id
  WHERE v.status = 'published'::public.content_status AND v.archived = false
    AND m.status = 'published'::public.content_status AND m.archived = false
    AND b.is_active = true AND b.archived = false
    AND v.width IS NOT NULL
  ORDER BY v.width;
$$;

-- 2) Profiles for a width
CREATE OR REPLACE FUNCTION public.get_public_tyre_profiles(_width integer)
RETURNS TABLE(profile integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT DISTINCT v.profile
  FROM public.tyre_variants v
  JOIN public.tyre_models  m ON m.id = v.model_id
  JOIN public.brands       b ON b.id = m.brand_id
  WHERE v.status = 'published'::public.content_status AND v.archived = false
    AND m.status = 'published'::public.content_status AND m.archived = false
    AND b.is_active = true AND b.archived = false
    AND v.width = _width
    AND v.profile IS NOT NULL
  ORDER BY v.profile;
$$;

-- 3) Rims for width+profile
CREATE OR REPLACE FUNCTION public.get_public_tyre_rims(_width integer, _profile integer)
RETURNS TABLE(rim numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT DISTINCT v.rim
  FROM public.tyre_variants v
  JOIN public.tyre_models  m ON m.id = v.model_id
  JOIN public.brands       b ON b.id = m.brand_id
  WHERE v.status = 'published'::public.content_status AND v.archived = false
    AND m.status = 'published'::public.content_status AND m.archived = false
    AND b.is_active = true AND b.archived = false
    AND v.width = _width AND v.profile = _profile
    AND v.rim IS NOT NULL
  ORDER BY v.rim;
$$;

-- 4) Usable vehicle makes
CREATE OR REPLACE FUNCTION public.get_public_vehicle_makes()
RETURNS TABLE(id uuid, name text, slug text, logo_url text, display_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT mk.id, mk.name, mk.slug, mk.logo_url, mk.display_order
  FROM public.vehicle_makes mk
  WHERE mk.is_active = true AND mk.archived = false
  ORDER BY mk.display_order, mk.name;
$$;

-- 5) Models for a make (parent validated)
CREATE OR REPLACE FUNCTION public.get_public_vehicle_models(_make_id uuid)
RETURNS TABLE(id uuid, name text, slug text, body_type text, is_popular boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT vm.id, vm.name, vm.slug, vm.body_type::text, vm.is_popular
  FROM public.vehicle_models vm
  JOIN public.vehicle_makes  mk ON mk.id = vm.make_id
  WHERE vm.make_id = _make_id
    AND vm.is_active = true AND vm.archived = false
    AND mk.is_active = true AND mk.archived = false
  ORDER BY vm.is_popular DESC, vm.name;
$$;

-- 6) Years for a model (parents validated)
CREATE OR REPLACE FUNCTION public.get_public_vehicle_years(_model_id uuid)
RETURNS TABLE(id uuid, year_from integer, year_to integer, variant_note text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT y.id, y.year_from, y.year_to, y.variant_note
  FROM public.vehicle_years  y
  JOIN public.vehicle_models vm ON vm.id = y.model_id
  JOIN public.vehicle_makes  mk ON mk.id = vm.make_id
  WHERE y.model_id = _model_id
    AND y.is_active = true AND y.archived = false
    AND vm.is_active = true AND vm.archived = false
    AND mk.is_active = true AND mk.archived = false
  ORDER BY y.year_from DESC NULLS LAST, y.year_to DESC NULLS LAST;
$$;

-- 7) Configurations (verified/partial only) for model, optional year filter
CREATE OR REPLACE FUNCTION public.get_public_vehicle_configurations(_model_id uuid, _year integer DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  trim_name text,
  engine_name text,
  engine_capacity_cc integer,
  fuel_type text,
  transmission text,
  drivetrain text,
  body_type text,
  market text,
  pk_year_from integer,
  pk_year_to integer,
  production_year_from integer,
  production_year_to integer,
  verification_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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
    AND c.verification_status IN ('verified'::public.spec_verification_status, 'partial'::public.spec_verification_status)
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
    CASE c.verification_status WHEN 'verified'::public.spec_verification_status THEN 0 ELSE 1 END,
    COALESCE(c.pk_year_from, c.production_year_from) DESC NULLS LAST,
    c.trim_name NULLS LAST,
    c.id;
$$;

-- 8) OEM tyre sizes for a configuration
CREATE OR REPLACE FUNCTION public.get_public_vehicle_oem_tyre_sizes(_configuration_id uuid)
RETURNS TABLE(
  id uuid,
  layout text,
  front_width integer, front_profile integer, front_rim integer,
  front_load_index integer, front_speed_rating text,
  rear_width integer, rear_profile integer, rear_rim integer,
  rear_load_index integer, rear_speed_rating text,
  is_primary boolean,
  verification_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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
    AND s.verification_status IN ('verified'::public.spec_verification_status, 'partial'::public.spec_verification_status)
    AND c.archived = false
    AND c.verification_status IN ('verified'::public.spec_verification_status, 'partial'::public.spec_verification_status)
    AND vm.is_active = true AND vm.archived = false
    AND mk.is_active = true AND mk.archived = false
  ORDER BY s.is_primary DESC,
           CASE s.verification_status WHEN 'verified'::public.spec_verification_status THEN 0 ELSE 1 END,
           s.id;
$$;

-- 9) Server-side paginated tyre search (numeric matching + safe fields + total count)
CREATE OR REPLACE FUNCTION public.search_public_tyres(
  _width      integer  DEFAULT NULL,
  _profile    integer  DEFAULT NULL,
  _rim        numeric  DEFAULT NULL,
  _brand_id   uuid     DEFAULT NULL,
  _availability text   DEFAULT NULL,
  _tyre_type  text     DEFAULT NULL,
  _run_flat   boolean  DEFAULT NULL,
  _sort       text     DEFAULT 'relevance',
  _page       integer  DEFAULT 1,
  _page_size  integer  DEFAULT 24
)
RETURNS TABLE(
  variant_id uuid,
  model_id uuid,
  model_name text,
  model_slug text,
  short_desc text,
  tyre_type text,
  images jsonb,
  brand_id uuid,
  brand_name text,
  brand_logo_url text,
  normalized_size text,
  width integer,
  profile integer,
  rim numeric,
  load_index text,
  speed_rating text,
  price_mode text,
  price numeric,
  previous_price numeric,
  availability text,
  run_flat boolean,
  xl_reinforced boolean,
  tubeless boolean,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _offset integer := GREATEST(0, (COALESCE(_page,1) - 1) * COALESCE(_page_size,24));
  _limit  integer := LEAST(GREATEST(COALESCE(_page_size,24), 1), 100);
  _total  bigint;
BEGIN
  SELECT count(*) INTO _total
  FROM public.tyre_variants v
  JOIN public.tyre_models  m ON m.id = v.model_id
  JOIN public.brands       b ON b.id = m.brand_id
  WHERE v.status = 'published'::public.content_status AND v.archived = false
    AND m.status = 'published'::public.content_status AND m.archived = false
    AND b.is_active = true AND b.archived = false
    AND (_width       IS NULL OR v.width = _width)
    AND (_profile     IS NULL OR v.profile = _profile)
    AND (_rim         IS NULL OR v.rim = _rim)
    AND (_brand_id    IS NULL OR b.id = _brand_id)
    AND (_availability IS NULL OR v.availability::text = _availability)
    AND (_tyre_type   IS NULL OR m.tyre_type::text = _tyre_type)
    AND (_run_flat    IS NULL OR v.run_flat = _run_flat);

  RETURN QUERY
  SELECT v.id, v.model_id, m.name, m.slug,
         m.short_desc, m.tyre_type::text, m.images,
         b.id, b.name, b.logo_url,
         v.normalized_size, v.width, v.profile, v.rim,
         v.load_index, v.speed_rating,
         v.price_mode::text, v.price, v.previous_price,
         v.availability::text,
         v.run_flat, v.xl_reinforced, v.tubeless,
         _total
  FROM public.tyre_variants v
  JOIN public.tyre_models  m ON m.id = v.model_id
  JOIN public.brands       b ON b.id = m.brand_id
  WHERE v.status = 'published'::public.content_status AND v.archived = false
    AND m.status = 'published'::public.content_status AND m.archived = false
    AND b.is_active = true AND b.archived = false
    AND (_width       IS NULL OR v.width = _width)
    AND (_profile     IS NULL OR v.profile = _profile)
    AND (_rim         IS NULL OR v.rim = _rim)
    AND (_brand_id    IS NULL OR b.id = _brand_id)
    AND (_availability IS NULL OR v.availability::text = _availability)
    AND (_tyre_type   IS NULL OR m.tyre_type::text = _tyre_type)
    AND (_run_flat    IS NULL OR v.run_flat = _run_flat)
  ORDER BY
    CASE WHEN _sort = 'availability' AND v.availability::text = 'in_stock' THEN 0 ELSE 1 END,
    CASE WHEN _sort = 'price_asc'  THEN v.price END ASC  NULLS LAST,
    CASE WHEN _sort = 'price_desc' THEN v.price END DESC NULLS LAST,
    b.name, m.name, v.normalized_size, v.id
  OFFSET _offset
  LIMIT  _limit;
END $$;

-- Lock down execution
REVOKE ALL ON FUNCTION public.get_public_tyre_widths()                                                 FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_tyre_profiles(integer)                                        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_tyre_rims(integer, integer)                                   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_vehicle_makes()                                               FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_vehicle_models(uuid)                                          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_vehicle_years(uuid)                                           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_vehicle_configurations(uuid, integer)                         FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_vehicle_oem_tyre_sizes(uuid)                                  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_public_tyres(integer,integer,numeric,uuid,text,text,boolean,text,integer,integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_tyre_widths()                                              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tyre_profiles(integer)                                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tyre_rims(integer, integer)                                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_vehicle_makes()                                            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_vehicle_models(uuid)                                       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_vehicle_years(uuid)                                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_vehicle_configurations(uuid, integer)                      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_vehicle_oem_tyre_sizes(uuid)                               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_tyres(integer,integer,numeric,uuid,text,text,boolean,text,integer,integer) TO anon, authenticated;
