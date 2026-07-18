
-- Stage B: Tyre Catalogue Completion — additive migration

-- 1. Enums (idempotent)
DO $$ BEGIN CREATE TYPE public.tyre_size_dimension AS ENUM ('width','profile','rim'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.tyre_type AS ENUM ('passenger','suv_4x4','commercial','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.tube_type AS ENUM ('tubeless','tube_type','unspecified'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','closed','lost'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_contact_method AS ENUM ('whatsapp','call','either'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Additive columns
ALTER TABLE public.tyre_models
  ADD COLUMN IF NOT EXISTS pattern_name text,
  ADD COLUMN IF NOT EXISTS tyre_type public.tyre_type,
  ADD COLUMN IF NOT EXISTS origin_country text,
  ADD COLUMN IF NOT EXISTS warranty_text text,
  ADD COLUMN IF NOT EXISTS recommended_use text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug text;

-- Backfill slug for existing models
UPDATE public.tyre_models m
SET slug = lower(regexp_replace(coalesce(b.name,'') || '-' || m.name, '[^a-zA-Z0-9]+', '-', 'g'))
FROM public.brands b
WHERE m.brand_id = b.id AND m.slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tyre_models_slug_key ON public.tyre_models (slug) WHERE slug IS NOT NULL;

ALTER TABLE public.tyre_variants
  ADD COLUMN IF NOT EXISTS width int,
  ADD COLUMN IF NOT EXISTS profile int,
  ADD COLUMN IF NOT EXISTS rim int,
  ADD COLUMN IF NOT EXISTS tube_type public.tube_type NOT NULL DEFAULT 'unspecified',
  ADD COLUMN IF NOT EXISTS availability_note text;

-- Backfill width/profile/rim from normalized_size like "195/65 R15"
UPDATE public.tyre_variants
SET
  width = COALESCE(width, NULLIF((regexp_match(normalized_size, '(\d{3})/(\d{2})\s*R(\d{2})'))[1], '')::int),
  profile = COALESCE(profile, NULLIF((regexp_match(normalized_size, '(\d{3})/(\d{2})\s*R(\d{2})'))[2], '')::int),
  rim = COALESCE(rim, NULLIF((regexp_match(normalized_size, '(\d{3})/(\d{2})\s*R(\d{2})'))[3], '')::int)
WHERE normalized_size IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tyre_variants_unique_size
  ON public.tyre_variants (model_id, width, profile, rim, COALESCE(load_index,''), COALESCE(speed_rating,''))
  WHERE width IS NOT NULL AND profile IS NOT NULL AND rim IS NOT NULL;

-- Brands unique lowercased name
CREATE UNIQUE INDEX IF NOT EXISTS brands_name_lower_key ON public.brands (lower(name));

-- 3. Tyre size options
CREATE TABLE IF NOT EXISTS public.tyre_size_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension public.tyre_size_dimension NOT NULL,
  value int NOT NULL,
  label text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dimension, value)
);
GRANT SELECT ON public.tyre_size_options TO anon, authenticated;
GRANT ALL ON public.tyre_size_options TO service_role, authenticated;
ALTER TABLE public.tyre_size_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY tso_public_read ON public.tyre_size_options FOR SELECT USING (true);
CREATE POLICY tso_admin_write ON public.tyre_size_options FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER tso_updated_at BEFORE UPDATE ON public.tyre_size_options FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed defaults
INSERT INTO public.tyre_size_options (dimension, value) SELECT 'width', v FROM generate_series(145,335,10) v ON CONFLICT DO NOTHING;
INSERT INTO public.tyre_size_options (dimension, value) SELECT 'profile', v FROM unnest(ARRAY[25,30,35,40,45,50,55,60,65,70,75,80,85]) v ON CONFLICT DO NOTHING;
INSERT INTO public.tyre_size_options (dimension, value) SELECT 'rim', v FROM generate_series(12,24) v ON CONFLICT DO NOTHING;

-- 4. Variant-level vehicle compatibility
CREATE TABLE IF NOT EXISTS public.tyre_variant_vehicle_compat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.tyre_variants(id) ON DELETE CASCADE,
  make_id uuid REFERENCES public.vehicle_makes(id) ON DELETE CASCADE,
  model_id uuid REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  year_id uuid REFERENCES public.vehicle_years(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tyre_variant_vehicle_compat TO anon, authenticated;
GRANT ALL ON public.tyre_variant_vehicle_compat TO service_role, authenticated;
ALTER TABLE public.tyre_variant_vehicle_compat ENABLE ROW LEVEL SECURITY;
CREATE POLICY tvvc_public_read ON public.tyre_variant_vehicle_compat FOR SELECT USING (true);
CREATE POLICY tvvc_admin_write ON public.tyre_variant_vehicle_compat FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS tvvc_variant_idx ON public.tyre_variant_vehicle_compat(variant_id);
CREATE TRIGGER tvvc_updated_at BEFORE UPDATE ON public.tyre_variant_vehicle_compat FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  message text,
  preferred_contact public.lead_contact_method NOT NULL DEFAULT 'whatsapp',
  tyre_size text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year text,
  source_page text,
  search_context jsonb DEFAULT '{}'::jsonb,
  variant_id uuid REFERENCES public.tyre_variants(id) ON DELETE SET NULL,
  model_id uuid REFERENCES public.tyre_models(id) ON DELETE SET NULL,
  status public.lead_status NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY leads_public_insert ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY leads_admin_select ON public.leads FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY leads_admin_update ON public.leads FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads(status, created_at DESC);
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Analytics events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  session_id text,
  page text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ae_public_insert ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY ae_admin_select ON public.analytics_events FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS ae_name_time_idx ON public.analytics_events(event_name, created_at DESC);
