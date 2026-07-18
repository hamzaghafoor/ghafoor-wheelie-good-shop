
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.product_category AS ENUM (
    'tyres','lubricants','filters','maintenance_parts','car_care','additives','accessories','services'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vehicle_body_type AS ENUM (
    'hatchback','sedan','suv','crossover','pickup','van','commercial','motorcycle','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ BRAND CATEGORIES ============
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS categories public.product_category[] NOT NULL DEFAULT '{}'::public.product_category[];

-- ============ VEHICLE REGISTRY ============
CREATE TABLE IF NOT EXISTS public.vehicle_makes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  logo_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug)
);
GRANT SELECT ON public.vehicle_makes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_makes TO authenticated;
GRANT ALL ON public.vehicle_makes TO service_role;
ALTER TABLE public.vehicle_makes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_makes_public_read" ON public.vehicle_makes FOR SELECT TO anon
  USING (is_active AND NOT archived);
CREATE POLICY "vehicle_makes_auth_read" ON public.vehicle_makes FOR SELECT TO authenticated
  USING ((is_active AND NOT archived) OR public.is_admin(auth.uid()));
CREATE POLICY "vehicle_makes_admin_write" ON public.vehicle_makes TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER vehicle_makes_touch BEFORE UPDATE ON public.vehicle_makes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id uuid NOT NULL REFERENCES public.vehicle_makes(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  body_type public.vehicle_body_type NOT NULL DEFAULT 'sedan',
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (make_id, slug)
);
GRANT SELECT ON public.vehicle_models TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_models TO authenticated;
GRANT ALL ON public.vehicle_models TO service_role;
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_models_public_read" ON public.vehicle_models FOR SELECT TO anon
  USING (is_active AND NOT archived);
CREATE POLICY "vehicle_models_auth_read" ON public.vehicle_models FOR SELECT TO authenticated
  USING ((is_active AND NOT archived) OR public.is_admin(auth.uid()));
CREATE POLICY "vehicle_models_admin_write" ON public.vehicle_models TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER vehicle_models_touch BEFORE UPDATE ON public.vehicle_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.vehicle_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  year_from int NOT NULL,
  year_to int,
  variant_note text,
  is_active boolean NOT NULL DEFAULT true,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_years TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_years TO authenticated;
GRANT ALL ON public.vehicle_years TO service_role;
ALTER TABLE public.vehicle_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_years_public_read" ON public.vehicle_years FOR SELECT TO anon
  USING (is_active AND NOT archived);
CREATE POLICY "vehicle_years_auth_read" ON public.vehicle_years FOR SELECT TO authenticated
  USING ((is_active AND NOT archived) OR public.is_admin(auth.uid()));
CREATE POLICY "vehicle_years_admin_write" ON public.vehicle_years TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER vehicle_years_touch BEFORE UPDATE ON public.vehicle_years
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ GENERIC PRODUCTS ============
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.product_category NOT NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  short_desc text,
  full_desc text,
  sku text,
  part_number text,
  images jsonb NOT NULL DEFAULT '{}'::jsonb,
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_mode public.price_mode NOT NULL DEFAULT 'confirm_today',
  price numeric,
  previous_price numeric,
  price_note text,
  price_verified_at timestamptz,
  price_verified_by uuid,
  availability public.availability_status NOT NULL DEFAULT 'check',
  availability_verified_at timestamptz,
  availability_verified_by uuid,
  is_featured boolean NOT NULL DEFAULT false,
  status public.content_status NOT NULL DEFAULT 'draft',
  archived boolean NOT NULL DEFAULT false,
  public_notes text,
  private_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, slug)
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon
  USING (status = 'published' AND NOT archived);
CREATE POLICY "products_auth_read" ON public.products FOR SELECT TO authenticated
  USING ((status = 'published' AND NOT archived) OR public.is_admin(auth.uid()));
CREATE POLICY "products_admin_write" ON public.products TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category) WHERE NOT archived;
CREATE INDEX IF NOT EXISTS products_brand_idx ON public.products (brand_id);

-- ============ VEHICLE COMPATIBILITY JOINS ============
CREATE TABLE IF NOT EXISTS public.product_vehicle_compat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vehicle_model_id uuid NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  year_from int,
  year_to int,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, vehicle_model_id, year_from, year_to)
);
GRANT SELECT ON public.product_vehicle_compat TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_vehicle_compat TO authenticated;
GRANT ALL ON public.product_vehicle_compat TO service_role;
ALTER TABLE public.product_vehicle_compat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pvc_public_read" ON public.product_vehicle_compat FOR SELECT TO anon USING (true);
CREATE POLICY "pvc_auth_read" ON public.product_vehicle_compat FOR SELECT TO authenticated USING (true);
CREATE POLICY "pvc_admin_write" ON public.product_vehicle_compat TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tyre_model_vehicle_compat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tyre_model_id uuid NOT NULL REFERENCES public.tyre_models(id) ON DELETE CASCADE,
  vehicle_model_id uuid NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  year_from int,
  year_to int,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tyre_model_id, vehicle_model_id, year_from, year_to)
);
GRANT SELECT ON public.tyre_model_vehicle_compat TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tyre_model_vehicle_compat TO authenticated;
GRANT ALL ON public.tyre_model_vehicle_compat TO service_role;
ALTER TABLE public.tyre_model_vehicle_compat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tmvc_public_read" ON public.tyre_model_vehicle_compat FOR SELECT TO anon USING (true);
CREATE POLICY "tmvc_auth_read" ON public.tyre_model_vehicle_compat FOR SELECT TO authenticated USING (true);
CREATE POLICY "tmvc_admin_write" ON public.tyre_model_vehicle_compat TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ SEARCH VIEW ============
CREATE OR REPLACE VIEW public.catalogue_search AS
  SELECT
    'tyre'::text AS kind,
    'tyres'::public.product_category AS category,
    m.id AS id,
    m.name AS title,
    b.name AS brand_name,
    b.id AS brand_id,
    NULL::text AS part_number,
    string_agg(DISTINCT v.normalized_size, ' ') AS size_or_spec,
    m.short_desc AS short_desc,
    m.images AS images,
    m.status AS status,
    m.archived AS archived,
    setweight(to_tsvector('simple', coalesce(m.name,'')), 'A')
      || setweight(to_tsvector('simple', coalesce(b.name,'')), 'A')
      || setweight(to_tsvector('simple', coalesce(string_agg(DISTINCT v.normalized_size, ' '),'')), 'B')
      || setweight(to_tsvector('simple', coalesce(m.short_desc,'')), 'C') AS tsv
  FROM public.tyre_models m
  JOIN public.brands b ON b.id = m.brand_id
  LEFT JOIN public.tyre_variants v ON v.model_id = m.id AND v.status = 'published' AND NOT v.archived
  WHERE m.status = 'published' AND NOT m.archived
  GROUP BY m.id, b.id
UNION ALL
  SELECT
    'product'::text AS kind,
    p.category,
    p.id,
    p.name AS title,
    b.name AS brand_name,
    b.id AS brand_id,
    p.part_number,
    coalesce(p.specs->>'viscosity', p.specs->>'pack_size', p.specs->>'filter_type', '') AS size_or_spec,
    p.short_desc,
    p.images,
    p.status,
    p.archived,
    setweight(to_tsvector('simple', coalesce(p.name,'')), 'A')
      || setweight(to_tsvector('simple', coalesce(b.name,'')), 'A')
      || setweight(to_tsvector('simple', coalesce(p.part_number,'')), 'A')
      || setweight(to_tsvector('simple', coalesce(p.short_desc,'')), 'C')
      || setweight(to_tsvector('simple', coalesce(p.specs::text,'')), 'C') AS tsv
  FROM public.products p
  LEFT JOIN public.brands b ON b.id = p.brand_id
  WHERE p.status = 'published' AND NOT p.archived;

GRANT SELECT ON public.catalogue_search TO anon, authenticated;
