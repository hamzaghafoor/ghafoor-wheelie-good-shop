
-- =========================================================================
-- CATALOGUE CMS — PHASE 1 (admin-first foundation)
-- =========================================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.homepage_catalogue_section_kind AS ENUM
    ('heading','product_grid','brand_grid','category_cards','cta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.packaging_unit_kind AS ENUM ('volume','mass','count');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- product_types
-- =========================================================================
CREATE TABLE public.product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  parent_category public.product_category NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_types_slug_uidx ON public.product_types (lower(slug));
CREATE UNIQUE INDEX product_types_name_cat_uidx ON public.product_types (parent_category, lower(name));
CREATE INDEX product_types_active_idx ON public.product_types (parent_category, display_order) WHERE is_active AND NOT archived;

GRANT SELECT ON public.product_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_types TO authenticated;
GRANT ALL ON public.product_types TO service_role;

ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_types_public_read" ON public.product_types
  FOR SELECT TO anon USING (is_active AND NOT archived);
CREATE POLICY "product_types_auth_read" ON public.product_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_types_admin_write" ON public.product_types
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER product_types_updated_at BEFORE UPDATE ON public.product_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- product_type_labels  (additive purpose labels)
-- =========================================================================
CREATE TABLE public.product_type_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id uuid REFERENCES public.product_types(id) ON DELETE CASCADE,
  label text NOT NULL,
  slug text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ptl_type_slug_uidx ON public.product_type_labels
  (COALESCE(type_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(slug));

GRANT SELECT ON public.product_type_labels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_type_labels TO authenticated;
GRANT ALL ON public.product_type_labels TO service_role;

ALTER TABLE public.product_type_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ptl_public_read" ON public.product_type_labels
  FOR SELECT TO anon USING (is_active AND NOT archived);
CREATE POLICY "ptl_auth_read" ON public.product_type_labels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ptl_admin_write" ON public.product_type_labels
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER ptl_updated_at BEFORE UPDATE ON public.product_type_labels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- packaging_units  (system-controlled conversion registry)
-- =========================================================================
CREATE TABLE public.packaging_units (
  code text PRIMARY KEY,
  display_label text NOT NULL,
  kind public.packaging_unit_kind NOT NULL,
  base_code text NOT NULL,
  factor_to_base numeric NOT NULL CHECK (factor_to_base > 0),
  is_visible boolean NOT NULL DEFAULT true,
  system_locked boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.packaging_units TO anon;
GRANT SELECT, UPDATE ON public.packaging_units TO authenticated;
GRANT ALL ON public.packaging_units TO service_role;

ALTER TABLE public.packaging_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_public_read" ON public.packaging_units FOR SELECT USING (true);
CREATE POLICY "units_admin_update" ON public.packaging_units
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Protect immutable conversion fields on system-locked units.
CREATE OR REPLACE FUNCTION public.protect_packaging_unit_conversion()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.system_locked AND (
       NEW.code <> OLD.code
    OR NEW.kind <> OLD.kind
    OR NEW.base_code <> OLD.base_code
    OR NEW.factor_to_base <> OLD.factor_to_base
    OR NEW.system_locked <> OLD.system_locked
  ) THEN
    RAISE EXCEPTION 'Cannot change conversion of a system-locked packaging unit'
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER packaging_units_protect BEFORE UPDATE ON public.packaging_units
  FOR EACH ROW EXECUTE FUNCTION public.protect_packaging_unit_conversion();

INSERT INTO public.packaging_units (code, display_label, kind, base_code, factor_to_base, display_order) VALUES
  ('ml',  'ml',   'volume','ml', 1,    10),
  ('L',   'L',    'volume','ml', 1000, 20),
  ('g',   'g',    'mass',  'g',  1,    30),
  ('kg',  'kg',   'mass',  'g',  1000, 40),
  ('pcs', 'pcs',  'count', 'pcs',1,    50),
  ('pack','pack', 'count', 'pcs',1,    60),
  ('set', 'set',  'count', 'pcs',1,    70);

-- =========================================================================
-- packaging_presets
-- =========================================================================
CREATE TABLE public.packaging_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value_numeric numeric NOT NULL CHECK (value_numeric > 0),
  unit_code text NOT NULL REFERENCES public.packaging_units(code),
  display_label text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX packaging_presets_val_unit_uidx ON public.packaging_presets (value_numeric, unit_code);

GRANT SELECT ON public.packaging_presets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_presets TO authenticated;
GRANT ALL ON public.packaging_presets TO service_role;

ALTER TABLE public.packaging_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presets_public_read" ON public.packaging_presets
  FOR SELECT TO anon USING (is_active);
CREATE POLICY "presets_auth_read" ON public.packaging_presets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "presets_admin_write" ON public.packaging_presets
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER packaging_presets_updated_at BEFORE UPDATE ON public.packaging_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.packaging_presets (value_numeric, unit_code, display_label, display_order) VALUES
  (250, 'ml',  '250 ml', 10),
  (500, 'ml',  '500 ml', 20),
  (0.7, 'L',   '0.7 L',  30),
  (1,   'L',   '1 L',    40),
  (3,   'L',   '3 L',    50),
  (4,   'L',   '4 L',    60),
  (4.2, 'L',   '4.2 L',  70),
  (5,   'L',   '5 L',    80),
  (1,   'kg',  '1 kg',   90),
  (1,   'pcs', 'piece',  100),
  (1,   'pack','pack',   110),
  (1,   'set', 'set',    120);

-- =========================================================================
-- Extend products
-- =========================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type_id uuid REFERENCES public.product_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purpose_label_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS erp_description text;

CREATE INDEX IF NOT EXISTS products_product_type_idx ON public.products (product_type_id);

-- =========================================================================
-- product_variants
-- =========================================================================
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  pack_value numeric NOT NULL CHECK (pack_value > 0),
  pack_unit_code text NOT NULL REFERENCES public.packaging_units(code),
  pack_label text,
  normalized_base_qty numeric NOT NULL,
  normalized_kind public.packaging_unit_kind NOT NULL,
  erp_stock_id text,
  price numeric CHECK (price IS NULL OR price >= 0),
  compare_at_price numeric CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  availability text NOT NULL DEFAULT 'check',
  image_path text,
  is_default boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  archived boolean NOT NULL DEFAULT false,
  private_notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Same pack size (after normalization) cannot repeat on a product.
-- 1 L (=1000 ml) and 1000 ml collide because both normalize to (volume, 1000).
CREATE UNIQUE INDEX pv_dedupe_uidx ON public.product_variants
  (product_id, normalized_kind, normalized_base_qty)
  WHERE archived = false;

-- ERP Stock ID unique (case-insensitive) across the whole store, ignoring archived rows.
CREATE UNIQUE INDEX pv_stock_id_uidx ON public.product_variants
  (lower(erp_stock_id))
  WHERE erp_stock_id IS NOT NULL AND archived = false;

-- Only one default variant per product (among non-archived rows).
CREATE UNIQUE INDEX pv_default_uidx ON public.product_variants
  (product_id)
  WHERE is_default = true AND archived = false;

CREATE INDEX pv_product_idx ON public.product_variants (product_id);
CREATE INDEX pv_public_idx  ON public.product_variants (product_id, display_order)
  WHERE status = 'published' AND archived = false;

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pv_public_read" ON public.product_variants
  FOR SELECT TO anon
  USING (
    status = 'published' AND archived = false
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.status = 'published' AND p.archived = false
    )
  );
CREATE POLICY "pv_auth_read" ON public.product_variants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_admin_write" ON public.product_variants
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Auto-normalize + auto-generate default pack label
CREATE OR REPLACE FUNCTION public.compute_variant_normalization()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE u RECORD; _num text;
BEGIN
  SELECT kind, factor_to_base, display_label INTO u
  FROM public.packaging_units WHERE code = NEW.pack_unit_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown packaging unit: %', NEW.pack_unit_code;
  END IF;
  NEW.normalized_kind := u.kind;
  NEW.normalized_base_qty := NEW.pack_value * u.factor_to_base;
  IF NEW.pack_label IS NULL OR btrim(NEW.pack_label) = '' THEN
    _num := regexp_replace(to_char(NEW.pack_value, 'FM999999990.999'), '\.?0+$', '');
    IF _num = '' THEN _num := '0'; END IF;
    NEW.pack_label := _num || ' ' || u.display_label;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER pv_normalize
  BEFORE INSERT OR UPDATE OF pack_value, pack_unit_code, pack_label
  ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.compute_variant_normalization();

CREATE TRIGGER pv_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- catalogue_settings (single row)
-- =========================================================================
CREATE TABLE public.catalogue_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_availability text NOT NULL DEFAULT 'check',
  default_import_status text NOT NULL DEFAULT 'draft',
  products_per_page int NOT NULL DEFAULT 24 CHECK (products_per_page BETWEEN 6 AND 96),
  whatsapp_cta_text text NOT NULL DEFAULT 'Chat on WhatsApp',
  empty_catalogue_message text NOT NULL DEFAULT 'No products available yet — please check back soon.',
  price_confirm_text text NOT NULL DEFAULT 'Contact for today''s price',
  catalogue_phone text,
  nav_categories text[] NOT NULL DEFAULT ARRAY['tyres','lubricants','filters','car_care','additives','accessories'],
  category_order text[] NOT NULL DEFAULT ARRAY['tyres','lubricants','filters','maintenance_parts','car_care','additives','accessories'],
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.catalogue_settings TO anon;
GRANT SELECT, UPDATE ON public.catalogue_settings TO authenticated;
GRANT ALL ON public.catalogue_settings TO service_role;

ALTER TABLE public.catalogue_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.catalogue_settings
  FOR SELECT USING (true);
CREATE POLICY "settings_admin_update" ON public.catalogue_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.catalogue_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.catalogue_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- =========================================================================
-- homepage_catalogue_sections  (structured, safe — not a builder)
-- =========================================================================
CREATE TABLE public.homepage_catalogue_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.homepage_catalogue_section_kind NOT NULL,
  heading text,
  description text,
  cta_label text,
  cta_link text,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  brand_ids uuid[] NOT NULL DEFAULT '{}',
  category_slugs text[] NOT NULL DEFAULT '{}',
  is_visible boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.homepage_catalogue_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_catalogue_sections TO authenticated;
GRANT ALL ON public.homepage_catalogue_sections TO service_role;

ALTER TABLE public.homepage_catalogue_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hcs_public_read" ON public.homepage_catalogue_sections
  FOR SELECT TO anon USING (is_visible = true);
CREATE POLICY "hcs_auth_read" ON public.homepage_catalogue_sections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "hcs_admin_write" ON public.homepage_catalogue_sections
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER hcs_updated_at BEFORE UPDATE ON public.homepage_catalogue_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- brand_merges  (audit trail for admin brand merges)
-- =========================================================================
CREATE TABLE public.brand_merges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_brand_id uuid NOT NULL,
  to_brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  moved_product_count int NOT NULL DEFAULT 0,
  moved_tyre_model_count int NOT NULL DEFAULT 0,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

GRANT SELECT, INSERT ON public.brand_merges TO authenticated;
GRANT ALL ON public.brand_merges TO service_role;

ALTER TABLE public.brand_merges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_merges_admin_read" ON public.brand_merges
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "brand_merges_admin_insert" ON public.brand_merges
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================================
-- merge_brand RPC (admin only)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.merge_brand(_from uuid, _to uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _prods int := 0; _tyre_models int := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _from = _to THEN RAISE EXCEPTION 'Source and target brands must differ'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = _from) THEN RAISE EXCEPTION 'Source brand not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = _to)   THEN RAISE EXCEPTION 'Target brand not found'; END IF;

  UPDATE public.products    SET brand_id = _to WHERE brand_id = _from;
  GET DIAGNOSTICS _prods = ROW_COUNT;

  UPDATE public.tyre_models SET brand_id = _to WHERE brand_id = _from;
  GET DIAGNOSTICS _tyre_models = ROW_COUNT;

  UPDATE public.brands SET archived = true, is_active = false WHERE id = _from;

  INSERT INTO public.brand_merges
    (from_brand_id, to_brand_id, moved_product_count, moved_tyre_model_count, performed_by, notes)
  VALUES
    (_from, _to, _prods, _tyre_models, auth.uid(), _notes);

  RETURN jsonb_build_object('ok', true, 'moved_products', _prods, 'moved_tyre_models', _tyre_models);
END $$;

REVOKE ALL ON FUNCTION public.merge_brand(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_brand(uuid, uuid, text) TO authenticated;

-- =========================================================================
-- Seed default product types (admin-editable afterwards; no sample products)
-- =========================================================================
INSERT INTO public.product_types (name, slug, parent_category, display_order) VALUES
  ('Engine Oil',         'engine-oil',         'lubricants', 10),
  ('Transmission Fluid', 'transmission-fluid', 'lubricants', 20),
  ('Gear Oil',           'gear-oil',           'lubricants', 30),
  ('Coolant',            'coolant',            'lubricants', 40),
  ('Brake Fluid',        'brake-fluid',        'lubricants', 50),
  ('AdBlue',             'adblue',             'lubricants', 60),
  ('Fuel Additive',      'fuel-additive',      'additives',  10),
  ('Engine Additive',    'engine-additive',    'additives',  20),
  ('Injector Cleaner',   'injector-cleaner',   'additives',  30),
  ('Engine Flush',       'engine-flush',       'additives',  40),
  ('DPF Cleaner',        'dpf-cleaner',        'additives',  50),
  ('Car Care',           'car-care',           'car_care',   10),
  ('Filters',            'filters',            'filters',    10),
  ('Accessories',        'accessories',        'accessories',10)
ON CONFLICT DO NOTHING;
