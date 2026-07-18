
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.price_mode AS ENUM ('fixed','confirm_today','on_request','starting_from','hidden');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.availability_status AS ENUM ('in_stock','limited','check','out_of_stock','on_order','discontinued');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.content_status AS ENUM ('draft','published','scheduled','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.section_type AS ENUM (
    'hero','announcement','trust_strip','tyre_finder','featured_brands','featured_tyres',
    'vehicle_categories','services_grid','promo_banner','image_text','why_us','reviews',
    'articles','faq','location','contact_cta','whatsapp_cta','custom_text'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ BRANDS ============
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_normalized text GENERATED ALWAYS AS (lower(regexp_replace(name, '\s+', '', 'g'))) STORED UNIQUE,
  slug text UNIQUE,
  logo_url text,
  country text,
  description text,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'published',
  archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY brands_public_read ON public.brands FOR SELECT TO anon
  USING (is_active AND NOT archived AND status='published');
CREATE POLICY brands_auth_read ON public.brands FOR SELECT TO authenticated
  USING ((is_active AND NOT archived AND status='published') OR public.is_admin(auth.uid()));
CREATE POLICY brands_admin_write ON public.brands FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ TYRE MODELS ============
CREATE TABLE IF NOT EXISTS public.tyre_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  short_desc text,
  full_desc text,
  vehicle_categories text[] NOT NULL DEFAULT '{}',
  driving_characteristics text[] NOT NULL DEFAULT '{}',
  warranty text,
  is_featured boolean NOT NULL DEFAULT false,
  internal_notes text,
  images jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.content_status NOT NULL DEFAULT 'draft',
  archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, name)
);
GRANT SELECT ON public.tyre_models TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tyre_models TO authenticated;
GRANT ALL ON public.tyre_models TO service_role;
ALTER TABLE public.tyre_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY tyre_models_public_read ON public.tyre_models FOR SELECT TO anon
  USING (status='published' AND NOT archived);
CREATE POLICY tyre_models_auth_read ON public.tyre_models FOR SELECT TO authenticated
  USING ((status='published' AND NOT archived) OR public.is_admin(auth.uid()));
CREATE POLICY tyre_models_admin_write ON public.tyre_models FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ TYRE VARIANTS ============
CREATE TABLE IF NOT EXISTS public.tyre_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.tyre_models(id) ON DELETE CASCADE,
  width int,
  profile int,
  rim numeric,
  size_format text NOT NULL DEFAULT 'metric',
  normalized_size text NOT NULL,
  price_mode public.price_mode NOT NULL DEFAULT 'confirm_today',
  price numeric,
  previous_price numeric,
  price_note text,
  price_verified_at timestamptz,
  price_verified_by uuid,
  availability public.availability_status NOT NULL DEFAULT 'check',
  availability_verified_at timestamptz,
  availability_verified_by uuid,
  load_index text,
  speed_rating text,
  tubeless boolean NOT NULL DEFAULT true,
  run_flat boolean NOT NULL DEFAULT false,
  xl_reinforced boolean NOT NULL DEFAULT false,
  ply_rating text,
  manufacturing_country text,
  warranty text,
  public_notes text,
  private_notes text,
  status public.content_status NOT NULL DEFAULT 'draft',
  archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, normalized_size)
);
GRANT SELECT ON public.tyre_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tyre_variants TO authenticated;
GRANT ALL ON public.tyre_variants TO service_role;
ALTER TABLE public.tyre_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tyre_variants_public_read ON public.tyre_variants FOR SELECT TO anon
  USING (status='published' AND NOT archived);
CREATE POLICY tyre_variants_auth_read ON public.tyre_variants FOR SELECT TO authenticated
  USING ((status='published' AND NOT archived) OR public.is_admin(auth.uid()));
CREATE POLICY tyre_variants_admin_write ON public.tyre_variants FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ MEDIA ASSETS ============
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  bucket text NOT NULL DEFAULT 'tyre-images',
  category text,
  alt_text text,
  filename text,
  mime text,
  size_bytes bigint,
  uploaded_by uuid,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_admin_all ON public.media_assets FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ HOMEPAGE SECTIONS ============
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.section_type NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  status public.content_status NOT NULL DEFAULT 'draft',
  archived boolean NOT NULL DEFAULT false,
  start_at timestamptz,
  end_at timestamptz,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_sections TO authenticated;
GRANT ALL ON public.homepage_sections TO service_role;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY sections_public_read ON public.homepage_sections FOR SELECT TO anon
  USING (
    is_visible AND NOT archived AND status='published'
    AND (start_at IS NULL OR now() >= start_at)
    AND (end_at IS NULL OR now() <= end_at)
  );
CREATE POLICY sections_auth_read ON public.homepage_sections FOR SELECT TO authenticated
  USING (
    (is_visible AND NOT archived AND status='published'
      AND (start_at IS NULL OR now() >= start_at)
      AND (end_at IS NULL OR now() <= end_at))
    OR public.is_admin(auth.uid())
  );
CREATE POLICY sections_admin_write ON public.homepage_sections FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ SECTION REVISIONS ============
CREATE TABLE IF NOT EXISTS public.section_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  config jsonb NOT NULL,
  status public.content_status NOT NULL,
  saved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.section_revisions TO authenticated;
GRANT ALL ON public.section_revisions TO service_role;
ALTER TABLE public.section_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY revisions_admin ON public.section_revisions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ BUSINESS INFO (singleton) ============
CREATE TABLE IF NOT EXISTS public.business_info (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name text NOT NULL DEFAULT 'Ghafoor Motors Tyres & Lubricants',
  logo_url text,
  phone text,
  whatsapp text,
  email text,
  address text,
  maps_url text,
  hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  holiday_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  temp_closure text,
  facebook text,
  instagram text,
  google_review_url text,
  currency text NOT NULL DEFAULT 'PKR',
  timezone text NOT NULL DEFAULT 'Asia/Karachi',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_info TO anon;
GRANT SELECT, INSERT, UPDATE ON public.business_info TO authenticated;
GRANT ALL ON public.business_info TO service_role;
ALTER TABLE public.business_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY biz_public_read ON public.business_info FOR SELECT TO anon USING (true);
CREATE POLICY biz_auth_read ON public.business_info FOR SELECT TO authenticated USING (true);
CREATE POLICY biz_admin_write ON public.business_info FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ ACTIVITY LOG ============
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_admin_read ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY activity_admin_insert ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- ============ TIMESTAMP TRIGGERS ============
CREATE TRIGGER brands_touch BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER models_touch BEFORE UPDATE ON public.tyre_models FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER variants_touch BEFORE UPDATE ON public.tyre_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER media_touch BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sections_touch BEFORE UPDATE ON public.homepage_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER biz_touch BEFORE UPDATE ON public.business_info FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SECTION REVISION TRIGGER ============
CREATE OR REPLACE FUNCTION public.log_section_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.section_revisions (section_id, config, status, saved_by)
  VALUES (NEW.id, NEW.config, NEW.status, auth.uid());
  RETURN NEW;
END; $$;
CREATE TRIGGER sections_revision AFTER INSERT OR UPDATE OF config, status ON public.homepage_sections
  FOR EACH ROW EXECUTE FUNCTION public.log_section_revision();

-- ============ SEED business_info + default homepage sections ============
INSERT INTO public.business_info (id, name, phone, whatsapp, email, address, maps_url, currency, timezone, hours)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Ghafoor Motors Tyres & Lubricants',
  '+92 300 0000000',
  '+923000000000',
  'ghafoormotorssprt@gmail.com',
  'Sialkot, Pakistan',
  '',
  'PKR',
  'Asia/Karachi',
  '{"mon_sat":"9:00 AM – 8:00 PM","sun":"Closed"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.homepage_sections (type, name, config, display_order, is_visible, status)
VALUES
  ('hero','Hero',
    '{"eyebrow":"Since 1985","heading":"Premium tyres & lubricants","highlight":"tyres","description":"Trusted by drivers across Sialkot for genuine tyres, oils and expert fitment.","primary_cta":{"label":"Find tyres","href":"/tyres"},"secondary_cta":{"label":"WhatsApp us","href":"https://wa.me/923000000000"},"trust_line":"Genuine stock • Same-day fitment","background":"off_white"}'::jsonb,
    10, true, 'published'),
  ('trust_strip','Trust strip',
    '{"items":[{"label":"Genuine stock"},{"label":"Same-day fitment"},{"label":"WhatsApp quotes"},{"label":"Family-run since 1985"}]}'::jsonb,
    20, true, 'published'),
  ('tyre_finder','Tyre finder','{}'::jsonb, 30, true, 'published'),
  ('featured_brands','Featured brands',
    '{"heading":"Trusted brands we stock","description":"","auto":true,"max":8}'::jsonb,
    40, true, 'published'),
  ('featured_tyres','Featured tyres',
    '{"heading":"Popular tyres","description":"","mode":"auto","limit":6}'::jsonb,
    50, true, 'published'),
  ('services_grid','Services',
    '{"heading":"Workshop services","description":""}'::jsonb,
    60, true, 'published'),
  ('location','Location',
    '{"heading":"Visit our workshop"}'::jsonb,
    70, true, 'published'),
  ('contact_cta','Contact CTA',
    '{"heading":"Need help choosing?","description":"Message us on WhatsApp — we reply fast.","cta":{"label":"Chat on WhatsApp","href":"https://wa.me/923000000000"}}'::jsonb,
    80, true, 'published')
ON CONFLICT DO NOTHING;
