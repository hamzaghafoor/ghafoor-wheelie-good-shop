
-- ENUMS
CREATE TYPE public.fuel_type AS ENUM ('petrol','diesel','hybrid','phev','ev','cng','lpg');
CREATE TYPE public.market_type AS ENUM ('PK','GLOBAL','JP_IMPORT','OTHER_IMPORT');
CREATE TYPE public.spec_source_type AS ENUM ('manufacturer','owner_manual','official_dealer','trusted_publication','community','other');
CREATE TYPE public.spec_verification_status AS ENUM ('needs_verification','partial','verified','disputed');
CREATE TYPE public.tyre_layout_type AS ENUM ('same','staggered');
CREATE TYPE public.import_kind AS ENUM ('vehicle_spec');
CREATE TYPE public.import_batch_status AS ENUM (
  'draft','validating','previewed','committing','succeeded','failed','cancelled',
  'rollback_in_progress','rolled_back','partially_rolled_back','rollback_failed'
);
CREATE TYPE public.import_row_status AS ENUM ('pending','ok','skipped','error','rolled_back','rollback_skipped','rollback_failed');
CREATE TYPE public.import_row_action AS ENUM ('insert','update','skip','error');
CREATE TYPE public.import_conflict_strategy AS ENUM ('skip','update','error');

-- IMMUTABLE enum→text wrappers (needed for expression indexes)
CREATE OR REPLACE FUNCTION public.imm_fuel_text(public.fuel_type) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT $1::text $$;
CREATE OR REPLACE FUNCTION public.imm_market_text(public.market_type) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT $1::text $$;

-- VEHICLE_CONFIGURATIONS
CREATE TABLE public.vehicle_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  trim_name TEXT,
  engine_code TEXT,
  engine_name TEXT,
  chassis_code TEXT,
  engine_capacity_cc INTEGER,
  fuel_type public.fuel_type,
  transmission TEXT,
  drivetrain TEXT,
  body_type TEXT,
  market public.market_type NOT NULL DEFAULT 'PK',
  production_year_from INTEGER,
  production_year_to INTEGER,
  pk_year_from INTEGER,
  pk_year_to INTEGER,
  source_type public.spec_source_type,
  source_url TEXT,
  source_notes TEXT,
  admin_notes TEXT,
  verification_status public.spec_verification_status NOT NULL DEFAULT 'needs_verification',
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vc_year_order CHECK (production_year_from IS NULL OR production_year_to IS NULL OR production_year_from <= production_year_to),
  CONSTRAINT vc_pk_year_order CHECK (pk_year_from IS NULL OR pk_year_to IS NULL OR pk_year_from <= pk_year_to),
  CONSTRAINT vc_engine_cc_range CHECK (engine_capacity_cc IS NULL OR (engine_capacity_cc BETWEEN 50 AND 12000))
);

CREATE UNIQUE INDEX vc_identity_uidx ON public.vehicle_configurations (
  model_id,
  (COALESCE(NULLIF(lower(btrim(trim_name)), ''), '∅')),
  (COALESCE(NULLIF(lower(btrim(engine_code)), ''), '∅')),
  (COALESCE(NULLIF(lower(btrim(engine_name)), ''), '∅')),
  (COALESCE(NULLIF(lower(btrim(chassis_code)), ''), '∅')),
  (COALESCE(engine_capacity_cc, -1)),
  (COALESCE(public.imm_fuel_text(fuel_type), '∅')),
  (COALESCE(public.imm_market_text(market), '∅')),
  (COALESCE(production_year_from, -1)),
  (COALESCE(production_year_to, -1)),
  (COALESCE(pk_year_from, -1)),
  (COALESCE(pk_year_to, -1))
);

CREATE INDEX vc_model_idx ON public.vehicle_configurations(model_id);
CREATE INDEX vc_verification_idx ON public.vehicle_configurations(verification_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_configurations TO authenticated;
GRANT ALL ON public.vehicle_configurations TO service_role;
ALTER TABLE public.vehicle_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY vc_admin_all ON public.vehicle_configurations FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER vc_set_updated_at BEFORE UPDATE ON public.vehicle_configurations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VEHICLE_OEM_TYRE_SPECS
CREATE TABLE public.vehicle_oem_tyre_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID NOT NULL REFERENCES public.vehicle_configurations(id) ON DELETE CASCADE,
  layout public.tyre_layout_type NOT NULL DEFAULT 'same',
  front_width INTEGER NOT NULL,
  front_profile INTEGER NOT NULL,
  front_rim INTEGER NOT NULL,
  front_load_index INTEGER,
  front_speed_rating TEXT,
  rear_width INTEGER,
  rear_profile INTEGER,
  rear_rim INTEGER,
  rear_load_index INTEGER,
  rear_speed_rating TEXT,
  front_size_label TEXT GENERATED ALWAYS AS (
    front_width::text || '/' || front_profile::text || 'R' || front_rim::text
  ) STORED,
  rear_size_label TEXT GENERATED ALWAYS AS (
    CASE WHEN rear_width IS NOT NULL AND rear_profile IS NOT NULL AND rear_rim IS NOT NULL
      THEN rear_width::text || '/' || rear_profile::text || 'R' || rear_rim::text
      ELSE NULL END
  ) STORED,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verification_status public.spec_verification_status NOT NULL DEFAULT 'needs_verification',
  source_type public.spec_source_type,
  source_url TEXT,
  source_notes TEXT,
  admin_notes TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vts_staggered_rear CHECK (
    layout = 'same' OR (rear_width IS NOT NULL AND rear_profile IS NOT NULL AND rear_rim IS NOT NULL)
  ),
  CONSTRAINT vts_same_rear_null CHECK (
    layout = 'staggered' OR (rear_width IS NULL AND rear_profile IS NULL AND rear_rim IS NULL)
  ),
  CONSTRAINT vts_width CHECK (front_width BETWEEN 100 AND 500 AND (rear_width IS NULL OR rear_width BETWEEN 100 AND 500)),
  CONSTRAINT vts_profile CHECK (front_profile BETWEEN 20 AND 90 AND (rear_profile IS NULL OR rear_profile BETWEEN 20 AND 90)),
  CONSTRAINT vts_rim CHECK (front_rim BETWEEN 10 AND 26 AND (rear_rim IS NULL OR rear_rim BETWEEN 10 AND 26))
);

CREATE INDEX vts_config_idx ON public.vehicle_oem_tyre_specs(configuration_id);
CREATE UNIQUE INDEX vts_one_primary_per_config ON public.vehicle_oem_tyre_specs(configuration_id) WHERE is_primary;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_oem_tyre_specs TO authenticated;
GRANT ALL ON public.vehicle_oem_tyre_specs TO service_role;
ALTER TABLE public.vehicle_oem_tyre_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY vts_admin_all ON public.vehicle_oem_tyre_specs FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER vts_set_updated_at BEFORE UPDATE ON public.vehicle_oem_tyre_specs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VEHICLE_OEM_OIL_SPECS
CREATE TABLE public.vehicle_oem_oil_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID NOT NULL REFERENCES public.vehicle_configurations(id) ON DELETE CASCADE,
  sae_grade TEXT NOT NULL,
  api_standard TEXT,
  acea_standard TEXT,
  ilsac_standard TEXT,
  jaso_standard TEXT,
  oem_approvals TEXT[],
  capacity_with_filter_l NUMERIC(5,2),
  capacity_without_filter_l NUMERIC(5,2),
  change_interval_km INTEGER,
  change_interval_months INTEGER,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verification_status public.spec_verification_status NOT NULL DEFAULT 'needs_verification',
  source_type public.spec_source_type,
  source_url TEXT,
  source_notes TEXT,
  admin_notes TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vos_capacity CHECK (
    (capacity_with_filter_l IS NULL OR capacity_with_filter_l BETWEEN 0.5 AND 30) AND
    (capacity_without_filter_l IS NULL OR capacity_without_filter_l BETWEEN 0.5 AND 30)
  )
);

CREATE INDEX vos_config_idx ON public.vehicle_oem_oil_specs(configuration_id);
CREATE UNIQUE INDEX vos_one_primary_per_config ON public.vehicle_oem_oil_specs(configuration_id) WHERE is_primary;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_oem_oil_specs TO authenticated;
GRANT ALL ON public.vehicle_oem_oil_specs TO service_role;
ALTER TABLE public.vehicle_oem_oil_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY vos_admin_all ON public.vehicle_oem_oil_specs FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER vos_set_updated_at BEFORE UPDATE ON public.vehicle_oem_oil_specs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VEHICLE_LUBRICANT_MATCHES
CREATE TABLE public.vehicle_lubricant_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oil_spec_id UUID NOT NULL REFERENCES public.vehicle_oem_oil_specs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  match_quality TEXT NOT NULL DEFAULT 'recommended',
  admin_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(oil_spec_id, product_id),
  CONSTRAINT vlm_quality CHECK (match_quality IN ('recommended','equivalent','alternative'))
);

CREATE INDEX vlm_oil_idx ON public.vehicle_lubricant_matches(oil_spec_id);
CREATE INDEX vlm_product_idx ON public.vehicle_lubricant_matches(product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_lubricant_matches TO authenticated;
GRANT ALL ON public.vehicle_lubricant_matches TO service_role;
ALTER TABLE public.vehicle_lubricant_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY vlm_admin_all ON public.vehicle_lubricant_matches FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER vlm_set_updated_at BEFORE UPDATE ON public.vehicle_lubricant_matches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- IMPORT_BATCHES
CREATE TABLE public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.import_kind NOT NULL,
  filename TEXT,
  uploader UUID REFERENCES auth.users(id),
  status public.import_batch_status NOT NULL DEFAULT 'draft',
  conflict_strategy public.import_conflict_strategy NOT NULL DEFAULT 'skip',
  allow_partial BOOLEAN NOT NULL DEFAULT false,
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_summary TEXT,
  rollback_expires_at TIMESTAMPTZ,
  committed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY ib_admin_all ON public.import_batches FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER ib_set_updated_at BEFORE UPDATE ON public.import_batches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- IMPORT_BATCH_ROWS
CREATE TABLE public.import_batch_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  status public.import_row_status NOT NULL DEFAULT 'pending',
  action public.import_row_action,
  target_table TEXT,
  target_id UUID,
  target_updated_at_after_import TIMESTAMPTZ,
  before_snapshot JSONB,
  after_snapshot JSONB,
  source_payload JSONB,
  source_payload_purged_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_id, row_number)
);

CREATE INDEX ibr_batch_idx ON public.import_batch_rows(batch_id);
CREATE INDEX ibr_target_idx ON public.import_batch_rows(target_table, target_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batch_rows TO authenticated;
GRANT ALL ON public.import_batch_rows TO service_role;
ALTER TABLE public.import_batch_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY ibr_admin_all ON public.import_batch_rows FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER ibr_set_updated_at BEFORE UPDATE ON public.import_batch_rows
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VERIFICATION TRIGGERS
CREATE OR REPLACE FUNCTION public.enforce_config_verification()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NEW.verification_status = 'verified' THEN
    IF NEW.trim_name IS NULL OR btrim(NEW.trim_name) = '' THEN missing := array_append(missing,'trim_name'); END IF;
    IF NEW.fuel_type IS NULL THEN missing := array_append(missing,'fuel_type'); END IF;
    IF NEW.production_year_from IS NULL THEN missing := array_append(missing,'production_year_from'); END IF;
    IF NEW.source_type IS NULL OR NEW.source_type NOT IN ('manufacturer','owner_manual','official_dealer') THEN
      missing := array_append(missing,'reliable source_type (manufacturer/owner_manual/official_dealer)');
    END IF;
    IF array_length(missing,1) > 0 THEN
      RAISE EXCEPTION 'Cannot mark configuration as verified. Missing: %', array_to_string(missing, ', ')
        USING ERRCODE = 'check_violation';
    END IF;
    IF (TG_OP = 'INSERT') OR (OLD.verification_status IS DISTINCT FROM 'verified') THEN
      NEW.verified_by := COALESCE(NEW.verified_by, auth.uid());
      NEW.verified_at := COALESCE(NEW.verified_at, now());
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vc_verify_check BEFORE INSERT OR UPDATE ON public.vehicle_configurations
FOR EACH ROW EXECUTE FUNCTION public.enforce_config_verification();

CREATE OR REPLACE FUNCTION public.enforce_tyre_spec_verification()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NEW.verification_status = 'verified' THEN
    IF NEW.source_type IS NULL OR NEW.source_type NOT IN ('manufacturer','owner_manual','official_dealer') THEN
      missing := array_append(missing,'reliable source_type');
    END IF;
    IF array_length(missing,1) > 0 THEN
      RAISE EXCEPTION 'Cannot mark tyre spec as verified. Missing: %', array_to_string(missing, ', ')
        USING ERRCODE = 'check_violation';
    END IF;
    IF (TG_OP = 'INSERT') OR (OLD.verification_status IS DISTINCT FROM 'verified') THEN
      NEW.verified_by := COALESCE(NEW.verified_by, auth.uid());
      NEW.verified_at := COALESCE(NEW.verified_at, now());
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vts_verify_check BEFORE INSERT OR UPDATE ON public.vehicle_oem_tyre_specs
FOR EACH ROW EXECUTE FUNCTION public.enforce_tyre_spec_verification();

CREATE OR REPLACE FUNCTION public.enforce_oil_spec_verification()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NEW.verification_status = 'verified' THEN
    IF NEW.sae_grade IS NULL OR btrim(NEW.sae_grade) = '' THEN missing := array_append(missing,'sae_grade'); END IF;
    IF COALESCE(NEW.api_standard,'') = '' AND COALESCE(NEW.acea_standard,'') = ''
       AND COALESCE(NEW.ilsac_standard,'') = '' AND COALESCE(NEW.jaso_standard,'') = '' THEN
      missing := array_append(missing,'at least one technical standard (API/ACEA/ILSAC/JASO)');
    END IF;
    IF NEW.source_type IS NULL OR NEW.source_type NOT IN ('manufacturer','owner_manual','official_dealer') THEN
      missing := array_append(missing,'reliable source_type');
    END IF;
    IF array_length(missing,1) > 0 THEN
      RAISE EXCEPTION 'Cannot mark oil spec as verified. Missing: %', array_to_string(missing, ', ')
        USING ERRCODE = 'check_violation';
    END IF;
    IF (TG_OP = 'INSERT') OR (OLD.verification_status IS DISTINCT FROM 'verified') THEN
      NEW.verified_by := COALESCE(NEW.verified_by, auth.uid());
      NEW.verified_at := COALESCE(NEW.verified_at, now());
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vos_verify_check BEFORE INSERT OR UPDATE ON public.vehicle_oem_oil_specs
FOR EACH ROW EXECUTE FUNCTION public.enforce_oil_spec_verification();

-- PUBLIC READ-ONLY RPCs
CREATE OR REPLACE FUNCTION public.get_vehicle_configurations(_model_id UUID)
RETURNS TABLE(
  id UUID, trim_name TEXT, engine_code TEXT, engine_name TEXT, chassis_code TEXT,
  engine_capacity_cc INTEGER, fuel_type TEXT, transmission TEXT, drivetrain TEXT, body_type TEXT,
  market TEXT, production_year_from INTEGER, production_year_to INTEGER,
  pk_year_from INTEGER, pk_year_to INTEGER, verification_status TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT c.id, c.trim_name, c.engine_code, c.engine_name, c.chassis_code,
         c.engine_capacity_cc, c.fuel_type::text, c.transmission, c.drivetrain, c.body_type,
         c.market::text, c.production_year_from, c.production_year_to,
         c.pk_year_from, c.pk_year_to, c.verification_status::text
  FROM public.vehicle_configurations c
  WHERE c.model_id = _model_id
    AND c.verification_status <> 'disputed'
  ORDER BY
    CASE WHEN c.market = 'PK' THEN 0 ELSE 1 END,
    CASE c.verification_status WHEN 'verified' THEN 0 WHEN 'partial' THEN 1 ELSE 2 END,
    COALESCE(c.pk_year_from, c.production_year_from) DESC NULLS LAST,
    c.trim_name;
$$;

CREATE OR REPLACE FUNCTION public.get_vehicle_oem_tyre_specs(_configuration_id UUID)
RETURNS TABLE(
  id UUID, layout TEXT,
  front_width INTEGER, front_profile INTEGER, front_rim INTEGER,
  front_load_index INTEGER, front_speed_rating TEXT,
  rear_width INTEGER, rear_profile INTEGER, rear_rim INTEGER,
  rear_load_index INTEGER, rear_speed_rating TEXT,
  front_size_label TEXT, rear_size_label TEXT,
  is_primary BOOLEAN, verification_status TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT s.id, s.layout::text,
         s.front_width, s.front_profile, s.front_rim, s.front_load_index, s.front_speed_rating,
         s.rear_width, s.rear_profile, s.rear_rim, s.rear_load_index, s.rear_speed_rating,
         s.front_size_label, s.rear_size_label,
         s.is_primary, s.verification_status::text
  FROM public.vehicle_oem_tyre_specs s
  WHERE s.configuration_id = _configuration_id
    AND s.verification_status <> 'disputed'
  ORDER BY
    s.is_primary DESC,
    CASE s.verification_status WHEN 'verified' THEN 0 WHEN 'partial' THEN 1 WHEN 'disputed' THEN 2 ELSE 3 END,
    s.updated_at DESC,
    s.id;
$$;

CREATE OR REPLACE FUNCTION public.get_vehicle_oem_oil_specs(_configuration_id UUID)
RETURNS TABLE(
  id UUID, sae_grade TEXT, api_standard TEXT, acea_standard TEXT, ilsac_standard TEXT, jaso_standard TEXT,
  oem_approvals TEXT[], capacity_with_filter_l NUMERIC, capacity_without_filter_l NUMERIC,
  change_interval_km INTEGER, change_interval_months INTEGER,
  is_primary BOOLEAN, verification_status TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT o.id, o.sae_grade, o.api_standard, o.acea_standard, o.ilsac_standard, o.jaso_standard,
         o.oem_approvals, o.capacity_with_filter_l, o.capacity_without_filter_l,
         o.change_interval_km, o.change_interval_months,
         o.is_primary, o.verification_status::text
  FROM public.vehicle_oem_oil_specs o
  WHERE o.configuration_id = _configuration_id
    AND o.verification_status <> 'disputed'
  ORDER BY
    o.is_primary DESC,
    CASE o.verification_status WHEN 'verified' THEN 0 WHEN 'partial' THEN 1 WHEN 'disputed' THEN 2 ELSE 3 END,
    o.updated_at DESC,
    o.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_vehicle_configurations(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vehicle_oem_tyre_specs(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vehicle_oem_oil_specs(UUID) TO anon, authenticated;
