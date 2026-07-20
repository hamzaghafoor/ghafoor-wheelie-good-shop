
-- =========================================================
-- Phase 3B Lite: Recommendations, freshness, universal search,
-- completeness, no-results leads.
-- =========================================================

-- 1) catalogue_settings: stale-days
ALTER TABLE public.catalogue_settings
  ADD COLUMN IF NOT EXISTS availability_stale_days integer NOT NULL DEFAULT 30
    CHECK (availability_stale_days BETWEEN 1 AND 365);

-- 2) leads: lead_type tag (backwards compatible)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_type text NOT NULL DEFAULT 'general'
    CHECK (lead_type IN ('general','tyre_no_results','catalogue_no_results','vehicle_no_match','callback'));

CREATE INDEX IF NOT EXISTS leads_lead_type_idx ON public.leads(lead_type);

-- 3) vehicle_recommendations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='recommendation_group') THEN
    CREATE TYPE public.recommendation_group AS ENUM ('best_match','premium','value','alternative');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.vehicle_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id uuid NOT NULL REFERENCES public.vehicle_makes(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  configuration_id uuid REFERENCES public.vehicle_configurations(id) ON DELETE CASCADE,
  category public.product_category NOT NULL,
  product_type_id uuid REFERENCES public.product_types(id) ON DELETE SET NULL,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  product_family_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rec_group public.recommendation_group NOT NULL DEFAULT 'best_match',
  label text,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, configuration_id, category, product_family_id, rec_group)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_recommendations TO authenticated;
GRANT ALL ON public.vehicle_recommendations TO service_role;

ALTER TABLE public.vehicle_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_recommendations admin all" ON public.vehicle_recommendations;
CREATE POLICY "vehicle_recommendations admin all"
  ON public.vehicle_recommendations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_vehicle_recs_updated ON public.vehicle_recommendations;
CREATE TRIGGER trg_vehicle_recs_updated
  BEFORE UPDATE ON public.vehicle_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS vr_model_idx ON public.vehicle_recommendations(model_id, category, is_active);
CREATE INDEX IF NOT EXISTS vr_config_idx ON public.vehicle_recommendations(configuration_id, category, is_active);
CREATE INDEX IF NOT EXISTS vr_family_idx ON public.vehicle_recommendations(product_family_id);

-- 4) Public RPC: vehicle recommendations (grouped, safe projection)
CREATE OR REPLACE FUNCTION public.get_public_vehicle_recommendations(
  _model_id uuid, _configuration_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  category text,
  rec_group text,
  label text,
  display_order integer,
  family_id uuid,
  family_name text,
  family_slug text,
  family_short_desc text,
  family_images jsonb,
  family_price_mode text,
  family_price numeric,
  family_previous_price numeric,
  family_availability text,
  family_availability_verified_at timestamptz,
  brand_id uuid,
  brand_name text,
  brand_logo_url text,
  product_type_id uuid,
  product_type_name text,
  active_variant_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT
    r.id,
    r.category::text,
    r.rec_group::text,
    COALESCE(r.label,
      CASE r.rec_group
        WHEN 'best_match'  THEN 'Best Match'
        WHEN 'premium'     THEN 'Premium Option'
        WHEN 'value'       THEN 'Value Option'
        WHEN 'alternative' THEN 'Alternative Brand'
      END) AS label,
    r.display_order,
    p.id, p.name, p.slug, p.short_desc, p.images,
    p.price_mode::text, p.price, p.previous_price,
    p.availability::text, p.availability_verified_at,
    b.id, b.name, b.logo_url,
    pt.id, pt.name,
    COALESCE((SELECT count(*) FROM public.product_variants v
              WHERE v.product_id = p.id AND v.status = 'published' AND v.archived = false), 0)
  FROM public.vehicle_recommendations r
  JOIN public.products p ON p.id = r.product_family_id
  JOIN public.brands   b ON b.id = r.brand_id
  LEFT JOIN public.product_types pt ON pt.id = r.product_type_id
  WHERE r.is_active = true
    AND r.model_id = _model_id
    AND (_configuration_id IS NULL OR r.configuration_id IS NULL OR r.configuration_id = _configuration_id)
    AND p.status = 'published' AND p.archived = false
    AND b.is_active = true AND b.archived = false
  ORDER BY r.category,
    CASE r.rec_group WHEN 'best_match' THEN 0 WHEN 'premium' THEN 1 WHEN 'value' THEN 2 ELSE 3 END,
    r.display_order, p.name;
$$;

REVOKE ALL ON FUNCTION public.get_public_vehicle_recommendations(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_vehicle_recommendations(uuid, uuid) TO anon, authenticated;

-- 5) Public RPC: universal catalogue search (safe projection)
CREATE OR REPLACE FUNCTION public.search_public_catalogue(
  _q text,
  _category text DEFAULT NULL,
  _product_type_id uuid DEFAULT NULL,
  _brand_id uuid DEFAULT NULL,
  _limit integer DEFAULT 60,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  category text,
  name text,
  slug text,
  short_desc text,
  images jsonb,
  price_mode text,
  price numeric,
  previous_price numeric,
  availability text,
  availability_verified_at timestamptz,
  brand_id uuid,
  brand_name text,
  brand_logo_url text,
  product_type_id uuid,
  product_type_name text,
  active_variant_count bigint,
  total_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  WITH q AS (SELECT '%' || lower(btrim(coalesce(_q,''))) || '%' AS like_pat),
  filtered AS (
    SELECT p.*, b.name AS b_name, b.logo_url AS b_logo,
           pt.name AS pt_name
    FROM public.products p
    JOIN public.brands b ON b.id = p.brand_id
    LEFT JOIN public.product_types pt ON pt.id = p.product_type_id
    , q
    WHERE p.status = 'published' AND p.archived = false
      AND b.is_active = true AND b.archived = false
      AND (_category IS NULL OR p.category::text = _category)
      AND (_product_type_id IS NULL OR p.product_type_id = _product_type_id)
      AND (_brand_id IS NULL OR p.brand_id = _brand_id)
      AND (
        coalesce(btrim(_q),'') = ''
        OR lower(p.name)             LIKE q.like_pat
        OR lower(coalesce(p.short_desc,''))  LIKE q.like_pat
        OR lower(coalesce(p.part_number,'')) LIKE q.like_pat
        OR lower(b.name)             LIKE q.like_pat
        OR lower(coalesce(pt.name,''))       LIKE q.like_pat
        OR EXISTS (
             SELECT 1 FROM public.product_variants v
             WHERE v.product_id = p.id AND v.status='published' AND v.archived=false
               AND (lower(coalesce(v.pack_label,'')) LIKE q.like_pat
                 OR lower(coalesce(v.pack_unit_code,'')) LIKE q.like_pat)
           )
      )
  ), counted AS (SELECT count(*) AS tc FROM filtered)
  SELECT f.id, f.category::text, f.name, f.slug, f.short_desc, f.images,
         f.price_mode::text, f.price, f.previous_price,
         f.availability::text, f.availability_verified_at,
         f.brand_id, f.b_name, f.b_logo,
         f.product_type_id, f.pt_name,
         COALESCE((SELECT count(*) FROM public.product_variants v
                   WHERE v.product_id = f.id AND v.status='published' AND v.archived=false), 0),
         c.tc
  FROM filtered f, counted c
  ORDER BY f.is_featured DESC, f.name
  LIMIT GREATEST(1, LEAST(_limit, 120)) OFFSET GREATEST(0, _offset);
$$;

REVOKE ALL ON FUNCTION public.search_public_catalogue(text, text, uuid, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_catalogue(text, text, uuid, uuid, integer, integer) TO anon, authenticated;

-- 6) Public RPC: single product family by slug (safe projection + variants)
CREATE OR REPLACE FUNCTION public.get_public_product_family(_slug text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE _row jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', p.id, 'category', p.category::text, 'name', p.name, 'slug', p.slug,
    'short_desc', p.short_desc, 'full_desc', p.full_desc, 'part_number', p.part_number,
    'specs', p.specs, 'images', p.images,
    'price_mode', p.price_mode::text, 'price', p.price, 'previous_price', p.previous_price,
    'price_note', p.price_note,
    'availability', p.availability::text,
    'availability_verified_at', p.availability_verified_at,
    'public_notes', p.public_notes,
    'brand', jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'slug', b.slug),
    'product_type', CASE WHEN pt.id IS NULL THEN NULL ELSE
                    jsonb_build_object('id', pt.id, 'name', pt.name) END,
    'variants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', v.id, 'pack_label', v.pack_label, 'pack_value', v.pack_value,
        'pack_unit_code', v.pack_unit_code, 'is_packless', v.is_packless,
        'price', v.price, 'compare_at_price', v.compare_at_price,
        'availability', v.availability, 'image_path', v.image_path,
        'is_default', v.is_default
      ) ORDER BY v.is_default DESC, v.display_order, v.pack_value)
      FROM public.product_variants v
      WHERE v.product_id = p.id AND v.status='published' AND v.archived=false
    ), '[]'::jsonb)
  ) INTO _row
  FROM public.products p
  JOIN public.brands b ON b.id = p.brand_id
  LEFT JOIN public.product_types pt ON pt.id = p.product_type_id
  WHERE p.slug = _slug AND p.status='published' AND p.archived=false
    AND b.is_active=true AND b.archived=false;
  RETURN _row;
END $$;

REVOKE ALL ON FUNCTION public.get_public_product_family(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_product_family(text) TO anon, authenticated;

-- 7) Admin-only: family completeness report
CREATE OR REPLACE FUNCTION public.get_family_completeness(_family_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
  _p RECORD; _var_count int; _missing text[] := ARRAY[]::text[]; _checks int := 0; _pass int := 0;
  _stale_days int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='insufficient_privilege';
  END IF;
  SELECT * INTO _p FROM public.products WHERE id=_family_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Family not found'; END IF;

  SELECT COALESCE(availability_stale_days,30) INTO _stale_days FROM public.catalogue_settings LIMIT 1;
  IF _stale_days IS NULL THEN _stale_days := 30; END IF;

  SELECT count(*) INTO _var_count FROM public.product_variants
    WHERE product_id=_family_id AND archived=false;

  _checks := _checks+1; IF _p.brand_id IS NOT NULL THEN _pass := _pass+1; ELSE _missing := _missing || 'brand'; END IF;
  _checks := _checks+1; IF _p.category IS NOT NULL THEN _pass := _pass+1; ELSE _missing := _missing || 'category'; END IF;
  _checks := _checks+1; IF btrim(coalesce(_p.name,''))<>'' THEN _pass := _pass+1; ELSE _missing := _missing || 'name'; END IF;
  _checks := _checks+1; IF _var_count > 0 THEN _pass := _pass+1; ELSE _missing := _missing || 'variant'; END IF;
  _checks := _checks+1; IF jsonb_array_length(coalesce(_p.images,'[]'::jsonb)) > 0 THEN _pass := _pass+1; ELSE _missing := _missing || 'image'; END IF;
  _checks := _checks+1; IF coalesce(jsonb_typeof(_p.specs),'null') = 'object' AND _p.specs <> '{}'::jsonb THEN _pass := _pass+1; ELSE _missing := _missing || 'specifications'; END IF;
  _checks := _checks+1; IF _p.price_mode IS NOT NULL THEN _pass := _pass+1; ELSE _missing := _missing || 'price_status'; END IF;
  _checks := _checks+1; IF _p.availability IS NOT NULL
                          AND (_p.availability_verified_at IS NULL
                               OR _p.availability_verified_at >= now() - (_stale_days || ' days')::interval)
                        THEN _pass := _pass+1; ELSE _missing := _missing || 'availability_fresh'; END IF;
  _checks := _checks+1; IF _p.status = 'published' THEN _pass := _pass+1; ELSE _missing := _missing || 'published'; END IF;

  RETURN jsonb_build_object(
    'family_id', _family_id,
    'percent', (100 * _pass / GREATEST(_checks,1)),
    'passed', _pass,
    'total', _checks,
    'missing', to_jsonb(_missing)
  );
END $$;

REVOKE ALL ON FUNCTION public.get_family_completeness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_family_completeness(uuid) TO authenticated;

-- 8) Admin-only: bulk completeness list (used by admin catalogue index filters)
CREATE OR REPLACE FUNCTION public.list_family_completeness_flags()
RETURNS TABLE(
  family_id uuid,
  missing_image boolean,
  missing_variant boolean,
  missing_specs boolean,
  missing_price boolean,
  stale_availability boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE _stale_days int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='insufficient_privilege';
  END IF;
  SELECT COALESCE(availability_stale_days,30) INTO _stale_days FROM public.catalogue_settings LIMIT 1;
  IF _stale_days IS NULL THEN _stale_days := 30; END IF;
  RETURN QUERY
  SELECT
    p.id,
    (jsonb_array_length(coalesce(p.images,'[]'::jsonb)) = 0),
    (NOT EXISTS (SELECT 1 FROM public.product_variants v WHERE v.product_id=p.id AND v.archived=false)),
    (coalesce(jsonb_typeof(p.specs),'null') <> 'object' OR p.specs = '{}'::jsonb),
    (p.price_mode IS NULL OR (p.price_mode='fixed' AND p.price IS NULL)),
    (p.availability_verified_at IS NULL
      OR p.availability_verified_at < now() - (_stale_days || ' days')::interval)
  FROM public.products p
  WHERE p.archived = false;
END $$;

REVOKE ALL ON FUNCTION public.list_family_completeness_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_family_completeness_flags() TO authenticated;
