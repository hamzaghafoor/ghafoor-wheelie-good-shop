
CREATE TYPE public.vehicle_fitment_status AS ENUM ('verified','commonly_used','needs_confirmation');
CREATE TYPE public.vehicle_fitment_source AS ENUM ('admin','import');

CREATE TABLE public.vehicle_fitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  make_id UUID NOT NULL REFERENCES public.vehicle_makes(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  year_from INT,
  year_to INT,
  trim TEXT,
  engine TEXT,
  market TEXT NOT NULL DEFAULT 'PK',
  status public.vehicle_fitment_status NOT NULL DEFAULT 'needs_confirmation',
  source public.vehicle_fitment_source NOT NULL DEFAULT 'admin',
  approved BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_fitments_target_check CHECK ((product_id IS NULL) <> (variant_id IS NULL)),
  CONSTRAINT vehicle_fitments_year_check CHECK (year_from IS NULL OR year_to IS NULL OR year_from <= year_to)
);

CREATE INDEX vehicle_fitments_model_idx ON public.vehicle_fitments(model_id) WHERE approved;
CREATE INDEX vehicle_fitments_product_idx ON public.vehicle_fitments(product_id);
CREATE INDEX vehicle_fitments_variant_idx ON public.vehicle_fitments(variant_id);
CREATE UNIQUE INDEX vehicle_fitments_unique_idx ON public.vehicle_fitments (
  COALESCE(product_id, variant_id),
  model_id,
  COALESCE(year_from, -1),
  COALESCE(year_to, -1),
  lower(COALESCE(trim, '')),
  lower(COALESCE(engine, '')),
  market
);

GRANT SELECT ON public.vehicle_fitments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicle_fitments TO authenticated;
GRANT ALL ON public.vehicle_fitments TO service_role;

ALTER TABLE public.vehicle_fitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fitments are readable by anyone"
  ON public.vehicle_fitments FOR SELECT USING (true);

CREATE POLICY "Admins manage fitments"
  ON public.vehicle_fitments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_vehicle_fitments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER vehicle_fitments_updated_at
  BEFORE UPDATE ON public.vehicle_fitments
  FOR EACH ROW EXECUTE FUNCTION public.set_vehicle_fitments_updated_at();

CREATE OR REPLACE FUNCTION public.rank_products_for_vehicle(
  _model_id UUID,
  _year INT DEFAULT NULL,
  _engine TEXT DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID,
  best_rank INT,
  verified BOOLEAN,
  needs_year_confirmation BOOLEAN,
  matched_fitment_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH resolved AS (
    SELECT
      f.id AS fitment_id,
      COALESCE(f.product_id, pv.product_id) AS product_id,
      f.status,
      CASE
        WHEN _year IS NOT NULL
             AND (f.year_from IS NULL OR _year >= f.year_from)
             AND (f.year_to   IS NULL OR _year <= f.year_to)
          THEN true ELSE false
      END AS year_ok,
      CASE
        WHEN _engine IS NOT NULL AND f.engine IS NOT NULL
             AND lower(f.engine) = lower(_engine)
          THEN true ELSE false
      END AS engine_ok
    FROM public.vehicle_fitments f
    LEFT JOIN public.product_variants pv ON pv.id = f.variant_id
    WHERE f.approved AND f.model_id = _model_id
  ),
  scored AS (
    SELECT
      r.fitment_id, r.product_id, r.status,
      CASE
        WHEN r.year_ok AND r.engine_ok AND r.status = 'verified'  THEN 100
        WHEN r.year_ok AND r.engine_ok                             THEN 90
        WHEN r.year_ok AND r.status = 'verified'                  THEN 85
        WHEN r.year_ok AND r.status = 'commonly_used'             THEN 75
        WHEN r.year_ok                                             THEN 65
        WHEN _year IS NULL AND r.status = 'verified'              THEN 55
        WHEN _year IS NULL AND r.status = 'commonly_used'         THEN 45
        WHEN _year IS NULL                                         THEN 40
        ELSE 30
      END AS score,
      (NOT r.year_ok) AS needs_year_confirmation
    FROM resolved r WHERE r.product_id IS NOT NULL
  ),
  ranked AS (
    SELECT DISTINCT ON (product_id)
      product_id, score AS best_rank,
      (status = 'verified' AND score >= 85) AS verified,
      needs_year_confirmation, fitment_id AS matched_fitment_id
    FROM scored
    ORDER BY product_id, score DESC, needs_year_confirmation ASC
  )
  SELECT product_id, best_rank, verified, needs_year_confirmation, matched_fitment_id FROM ranked;
$$;

REVOKE EXECUTE ON FUNCTION public.rank_products_for_vehicle(UUID, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rank_products_for_vehicle(UUID, INT, TEXT) TO anon, authenticated;
