
-- ============================================================
-- Controlled multi-tag system for products and variants
-- ============================================================

CREATE TYPE public.tag_group AS ENUM (
  'use_case','customer_segment','vehicle_class','benefit','product_tier','related_service'
);

CREATE TYPE public.tag_source AS ENUM ('seed','admin','import');

-- Immutable normalization: lowercase, spaces/underscores/punct -> hyphen,
-- collapse runs of hyphens, trim leading/trailing hyphens.
CREATE OR REPLACE FUNCTION public.normalize_tag_key(_raw text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, public
AS $$
  SELECT regexp_replace(
           regexp_replace(
             regexp_replace(lower(coalesce(_raw,'')), '[^a-z0-9]+', '-', 'g'),
             '-+', '-', 'g'),
           '(^-+)|(-+$)', '', 'g')
$$;

-- ------------------- tags -------------------
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  group_name public.tag_group NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT false, -- reserved; storefront still never renders raw tags
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tags_key_is_normalized CHECK (key = public.normalize_tag_key(key) AND length(key) > 0)
);
CREATE INDEX tags_group_idx ON public.tags(group_name) WHERE is_active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_admin_all" ON public.tags FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER tags_set_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------- tag_aliases -------------------
CREATE TABLE public.tag_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  alias_normalized text NOT NULL UNIQUE,
  alias_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tag_aliases_normalized_matches CHECK (alias_normalized = public.normalize_tag_key(alias_text))
);
CREATE INDEX tag_aliases_tag_idx ON public.tag_aliases(tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tag_aliases TO authenticated;
GRANT ALL ON public.tag_aliases TO service_role;
ALTER TABLE public.tag_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tag_aliases_admin_all" ON public.tag_aliases FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ------------------- product_tags (family level) -------------------
CREATE TABLE public.product_tags (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  source public.tag_source NOT NULL DEFAULT 'admin',
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, tag_id)
);
CREATE INDEX product_tags_product_idx ON public.product_tags(product_id);
CREATE INDEX product_tags_tag_idx     ON public.product_tags(tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_tags TO authenticated;
GRANT ALL ON public.product_tags TO service_role;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_tags_admin_all" ON public.product_tags FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER product_tags_set_updated_at BEFORE UPDATE ON public.product_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------- product_variant_tags (variant level overrides) -------------------
CREATE TABLE public.product_variant_tags (
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  -- 'add'    -> explicitly add this tag for this variant on top of inherited parent tags
  -- 'remove' -> explicitly remove this tag inherited from the parent product
  override_mode text NOT NULL DEFAULT 'add' CHECK (override_mode IN ('add','remove')),
  source public.tag_source NOT NULL DEFAULT 'admin',
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (variant_id, tag_id)
);
CREATE INDEX product_variant_tags_variant_idx ON public.product_variant_tags(variant_id);
CREATE INDEX product_variant_tags_tag_idx     ON public.product_variant_tags(tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variant_tags TO authenticated;
GRANT ALL ON public.product_variant_tags TO service_role;
ALTER TABLE public.product_variant_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_variant_tags_admin_all" ON public.product_variant_tags FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER product_variant_tags_set_updated_at BEFORE UPDATE ON public.product_variant_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------- helpers -------------------
CREATE OR REPLACE FUNCTION public.resolve_tag_by_alias(_raw text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH n AS (SELECT public.normalize_tag_key(_raw) AS k)
  SELECT id FROM public.tags, n WHERE key = n.k AND is_active
  UNION ALL
  SELECT tag_id FROM public.tag_aliases a, n WHERE a.alias_normalized = n.k
  LIMIT 1
$$;

-- Effective tags for a variant = (approved parent tags) UNION (approved variant 'add' tags)
--                                 EXCEPT (approved variant 'remove' tags)
CREATE OR REPLACE FUNCTION public.effective_variant_tag_ids(_variant_id uuid)
RETURNS TABLE(tag_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH v AS (SELECT product_id FROM public.product_variants WHERE id = _variant_id),
  parent_ok AS (
    SELECT pt.tag_id FROM public.product_tags pt, v
    WHERE pt.product_id = v.product_id AND pt.approved = true
  ),
  var_add AS (
    SELECT vt.tag_id FROM public.product_variant_tags vt
    WHERE vt.variant_id = _variant_id AND vt.approved = true AND vt.override_mode = 'add'
  ),
  var_remove AS (
    SELECT vt.tag_id FROM public.product_variant_tags vt
    WHERE vt.variant_id = _variant_id AND vt.approved = true AND vt.override_mode = 'remove'
  )
  SELECT tag_id FROM (
    SELECT tag_id FROM parent_ok
    UNION
    SELECT tag_id FROM var_add
  ) merged
  WHERE tag_id NOT IN (SELECT tag_id FROM var_remove)
$$;

-- ------------------- seed canonical tags -------------------
INSERT INTO public.tags (key, label, group_name, description) VALUES
  -- use_case
  ('daily-driving','Daily Driving','use_case','Everyday commuting'),
  ('highway','Highway','use_case','Long-distance highway use'),
  ('city','City','use_case','Short urban trips'),
  ('off-road','Off-Road','use_case','Rough terrain / trail'),
  ('all-terrain','All-Terrain','use_case','Mixed on/off road'),
  ('performance','Performance','use_case','Spirited / sporty driving'),
  ('winter','Winter','use_case','Cold-weather / snow'),
  ('all-season','All-Season','use_case','Year-round use'),

  -- customer_segment
  ('fleet','Fleet','customer_segment','Commercial fleet vehicles'),
  ('ride-share','Ride-Share','customer_segment','Uber / Careem / Bykea'),
  ('family','Family','customer_segment','Family car owners'),
  ('enthusiast','Enthusiast','customer_segment','Auto enthusiasts'),
  ('workshop','Workshop','customer_segment','Repair shop / bulk buyer'),

  -- vehicle_class
  ('sedan','Sedan','vehicle_class','Passenger sedans'),
  ('suv','SUV','vehicle_class','Sport utility vehicles'),
  ('crossover','Crossover','vehicle_class','Compact crossovers'),
  ('hatchback','Hatchback','vehicle_class','Hatchbacks'),
  ('pickup','Pickup','vehicle_class','Pickup trucks'),
  ('van','Van','vehicle_class','Vans / people carriers'),
  ('hybrid','Hybrid','vehicle_class','Hybrid vehicles'),
  ('luxury','Luxury','vehicle_class','Luxury vehicles'),
  ('commercial','Commercial','vehicle_class','Commercial vehicles'),

  -- benefit
  ('comfort','Comfort','benefit','Quiet, smooth ride'),
  ('fuel-efficient','Fuel-Efficient','benefit','Lower fuel consumption'),
  ('long-life','Long-Life','benefit','Extended service interval'),
  ('wet-grip','Wet Grip','benefit','Improved wet performance'),
  ('low-noise','Low Noise','benefit','Reduced road/engine noise'),
  ('heat-resistant','Heat-Resistant','benefit','Withstands high temperatures'),
  ('cold-start','Cold Start','benefit','Reliable cold-weather starting'),
  ('engine-protection','Engine Protection','benefit','Wear protection'),

  -- product_tier
  ('budget','Budget','product_tier','Entry-level price point'),
  ('mid-range','Mid-Range','product_tier','Balanced value'),
  ('premium','Premium','product_tier','Premium tier'),
  ('flagship','Flagship','product_tier','Top-of-line'),

  -- related_service
  ('wheel-alignment','Wheel Alignment','related_service','Pair with wheel alignment'),
  ('wheel-balancing','Wheel Balancing','related_service','Pair with wheel balancing'),
  ('tyre-rotation','Tyre Rotation','related_service','Pair with tyre rotation'),
  ('nitrogen-filling','Nitrogen Filling','related_service','Pair with nitrogen filling'),
  ('oil-change','Oil Change','related_service','Pair with oil change'),
  ('oil-filter','Oil Filter','related_service','Pair with oil filter replacement'),
  ('air-filter','Air Filter','related_service','Pair with air filter replacement'),
  ('coolant-flush','Coolant Flush','related_service','Pair with coolant service')
ON CONFLICT (key) DO NOTHING;

-- Seed common aliases (spelling / synonym variants)
INSERT INTO public.tag_aliases (tag_id, alias_text, alias_normalized)
SELECT t.id, v.alias_text, public.normalize_tag_key(v.alias_text)
FROM (VALUES
  ('daily-driving','commuting'),
  ('daily-driving','commute'),
  ('highway','motorway'),
  ('highway','freeway'),
  ('all-terrain','at'),
  ('off-road','offroad'),
  ('off-road','mud-terrain'),
  ('performance','sport'),
  ('performance','sporty'),
  ('all-season','all season'),
  ('fuel-efficient','low-friction'),
  ('fuel-efficient','eco'),
  ('long-life','long-drain'),
  ('long-life','extended-drain'),
  ('low-noise','quiet'),
  ('suv','sport-utility'),
  ('pickup','truck'),
  ('van','minivan'),
  ('luxury','premium-car'),
  ('premium','high-end'),
  ('flagship','top-tier'),
  ('wheel-alignment','alignment'),
  ('wheel-balancing','balancing'),
  ('oil-filter','oil-filters'),
  ('air-filter','air-filters')
) AS v(canonical_key, alias_text)
JOIN public.tags t ON t.key = v.canonical_key
ON CONFLICT (alias_normalized) DO NOTHING;

-- ============================================================
-- Extend catalogue import to persist suggested tags on commit
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_catalogue_import_batch(_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _batch RECORD;
  _row RECORD;
  _payload jsonb;
  _created_families int := 0;
  _added_variants   int := 0;
  _updated_variants int := 0;
  _skipped int := 0;
  _failed  int := 0;
  _tags_suggested int := 0;
  _brand_id uuid;
  _brand_key text;
  _brand_created boolean;
  _batch_brand_map jsonb := '{}'::jsonb;
  _family_key text;
  _family_id uuid;
  _batch_family_map jsonb := '{}'::jsonb;
  _variant_id uuid;
  _pack_value numeric;
  _pack_unit  text;
  _pack_label text;
  _is_packless boolean;
  _tables text[];
  _ids uuid[];
  _updated_at_map jsonb;
  _last_updated_at timestamptz;
  _u timestamptz;
  _before jsonb;
  _after jsonb;
  _new_name text;
  _prod_category public.product_category;
  _prod_type_id uuid;
  _slug text;
  _tag_ins int;
BEGIN
  IF NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='insufficient_privilege';
  END IF;

  SELECT * INTO _batch FROM public.import_batches WHERE id=_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF _batch.kind <> 'catalogue' THEN
    RAISE EXCEPTION 'Wrong batch kind (expected catalogue, got %)', _batch.kind;
  END IF;
  IF _batch.status <> 'previewed' THEN
    RAISE EXCEPTION 'Batch must be in previewed state (is %)', _batch.status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.import_batch_rows r
    WHERE r.batch_id=_batch_id
      AND (r.source_payload->>'include')::boolean IS TRUE
      AND r.source_payload->>'action' IN ('invalid','needs_review')
  ) THEN
    RAISE EXCEPTION 'Batch contains unresolved invalid or needs_review rows';
  END IF;

  IF EXISTS (
    SELECT lower(r.source_payload->>'erp_stock_id') sid
    FROM public.import_batch_rows r
    WHERE r.batch_id=_batch_id
      AND (r.source_payload->>'include')::boolean IS TRUE
      AND coalesce(r.source_payload->>'erp_stock_id','') <> ''
    GROUP BY 1 HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate ERP Stock IDs in included rows';
  END IF;

  UPDATE public.import_batches SET status='committing' WHERE id=_batch_id;

  FOR _row IN
    SELECT * FROM public.import_batch_rows
    WHERE batch_id=_batch_id AND status='pending'
    ORDER BY row_number
  LOOP
    _payload := _row.source_payload;
    _tables := ARRAY[]::text[];
    _ids := ARRAY[]::uuid[];
    _updated_at_map := '{}'::jsonb;
    _last_updated_at := NULL;
    _before := '{}'::jsonb;
    _after := '{}'::jsonb;

    IF NOT COALESCE((_payload->>'include')::boolean, false)
       OR _payload->>'action' IN ('skip','invalid','needs_review') THEN
      UPDATE public.import_batch_rows SET status='skipped', action='skip' WHERE id=_row.id;
      _skipped := _skipped + 1;
      CONTINUE;
    END IF;

    _brand_id := NULL;
    _brand_created := false;
    _brand_key := lower(coalesce(_payload->'brand'->>'batch_brand_key',''));

    IF (_payload->'brand'->>'brand_id') IS NOT NULL AND (_payload->'brand'->>'brand_id') <> '' THEN
      _brand_id := (_payload->'brand'->>'brand_id')::uuid;
    ELSIF _brand_key <> '' AND _batch_brand_map ? _brand_key THEN
      _brand_id := (_batch_brand_map->_brand_key->>'id')::uuid;
    ELSIF (_payload->'brand'->>'match_type') = 'new'
          AND coalesce(_payload->'brand'->>'new_brand_name','') <> '' THEN
      _new_name := btrim(_payload->'brand'->>'new_brand_name');
      SELECT id INTO _brand_id
      FROM public.brands
      WHERE name_normalized = lower(regexp_replace(_new_name,'\s+','','g'))
        AND archived=false
      LIMIT 1;
      IF _brand_id IS NULL THEN
        _slug := lower(regexp_replace(_new_name,'[^a-zA-Z0-9]+','-','g'));
        _slug := regexp_replace(_slug,'(^-+)|(-+$)','','g');
        IF EXISTS (SELECT 1 FROM public.brands WHERE slug=_slug) THEN
          _slug := _slug || '-' || substr(md5(random()::text),1,6);
        END IF;
        INSERT INTO public.brands(name, slug, is_active, status, created_by)
        VALUES (_new_name, _slug, true, 'draft'::content_status, _uid)
        RETURNING id, updated_at INTO _brand_id, _u;
        _brand_created := true;
        _tables := ARRAY['brands']::text[]; _ids := ARRAY[_brand_id]::uuid[];
        _updated_at_map := _updated_at_map || jsonb_build_object(_brand_id::text, to_jsonb(_u));
        _last_updated_at := _u;
      END IF;
      IF _brand_key <> '' THEN
        _batch_brand_map := _batch_brand_map || jsonb_build_object(
          _brand_key, jsonb_build_object('id',_brand_id,'created',_brand_created)
        );
      END IF;
    ELSE
      RAISE EXCEPTION 'Row %: brand not confirmed', _row.row_number;
    END IF;

    _family_id := NULL;
    _family_key := coalesce(_payload->'product'->>'family_key','');

    IF (_payload->'product'->>'product_id') IS NOT NULL AND (_payload->'product'->>'product_id') <> '' THEN
      _family_id := (_payload->'product'->>'product_id')::uuid;
    ELSIF _family_key <> '' AND _batch_family_map ? _family_key THEN
      _family_id := (_batch_family_map->>_family_key)::uuid;
    END IF;

    IF _family_id IS NULL THEN
      _new_name := btrim(coalesce(_payload->'product'->>'name',''));
      IF _new_name = '' THEN
        RAISE EXCEPTION 'Row %: product family name is required', _row.row_number;
      END IF;
      _prod_category := (_payload->'product'->>'category')::public.product_category;
      _prod_type_id := NULLIF(_payload->'product'->>'product_type_id','')::uuid;

      _slug := lower(regexp_replace(_new_name,'[^a-zA-Z0-9]+','-','g'));
      _slug := regexp_replace(_slug,'(^-+)|(-+$)','','g');
      IF EXISTS (SELECT 1 FROM public.products WHERE category=_prod_category AND slug=_slug) THEN
        _slug := _slug || '-' || substr(md5(random()::text),1,6);
      END IF;

      INSERT INTO public.products(
        category, brand_id, name, slug, product_type_id, purpose_label_ids,
        erp_description, internal_notes, status, availability, archived, created_by
      ) VALUES (
        _prod_category, _brand_id, _new_name, _slug, _prod_type_id,
        COALESCE(
          (SELECT array_agg((x)::uuid) FROM jsonb_array_elements_text(_payload->'product'->'purpose_label_ids') x),
          '{}'::uuid[]),
        NULLIF(_payload->'product'->>'erp_description',''),
        'Imported from ERP batch ' || _batch_id::text,
        'draft'::content_status, 'check'::availability_status, false, _uid
      ) RETURNING id, updated_at INTO _family_id, _u;

      _tables := array_append(_tables, 'products'); _ids := array_append(_ids, _family_id);
      _updated_at_map := _updated_at_map || jsonb_build_object(_family_id::text, to_jsonb(_u));
      _last_updated_at := _u;
      _created_families := _created_families + 1;

      IF _family_key <> '' THEN
        _batch_family_map := _batch_family_map || jsonb_build_object(_family_key, _family_id::text);
      END IF;
    END IF;

    -- Variant
    _variant_id := NULLIF(_payload->'variant'->>'variant_id','')::uuid;
    _is_packless := COALESCE((_payload->'variant'->>'no_pack_required')::boolean, false);
    _pack_label := NULLIF(_payload->'variant'->>'pack_label','');

    IF _is_packless THEN
      _pack_value := NULL;
      _pack_unit  := NULL;
    ELSE
      _pack_value := NULLIF(_payload->'variant'->>'pack_value','')::numeric;
      _pack_unit  := NULLIF(_payload->'variant'->>'pack_unit_code','');
    END IF;

    IF _variant_id IS NOT NULL AND _payload->>'action' = 'update_variant' THEN
      SELECT jsonb_build_object('products', jsonb_build_object('id',p.id,'erp_description',p.erp_description))
        INTO _before FROM public.products p WHERE p.id=_family_id;

      UPDATE public.products
      SET erp_description = COALESCE(NULLIF(_payload->'product'->>'erp_description',''), erp_description),
          updated_at = now()
      WHERE id=_family_id
      RETURNING updated_at INTO _u;

      _tables := array_append(_tables, 'products.update'); _ids := array_append(_ids, _family_id);
      _updated_at_map := _updated_at_map || jsonb_build_object(_family_id::text, to_jsonb(_u));
      _last_updated_at := _u;
      _updated_variants := _updated_variants + 1;
    ELSE
      IF NOT _is_packless AND (_pack_value IS NULL OR _pack_unit IS NULL) THEN
        RAISE EXCEPTION 'Row %: pack info missing (use no_pack_required=true for packless items)', _row.row_number;
      END IF;

      INSERT INTO public.product_variants(
        product_id, pack_value, pack_unit_code, pack_label, is_packless,
        erp_stock_id, availability, status, archived, created_by
      ) VALUES (
        _family_id, _pack_value, _pack_unit, _pack_label, _is_packless,
        NULLIF(_payload->>'erp_stock_id',''),
        'check', 'draft', false, _uid
      ) RETURNING id, updated_at INTO _variant_id, _u;

      _tables := array_append(_tables, 'product_variants'); _ids := array_append(_ids, _variant_id);
      _updated_at_map := _updated_at_map || jsonb_build_object(_variant_id::text, to_jsonb(_u));
      _last_updated_at := _u;
      _added_variants := _added_variants + 1;
    END IF;

    -- Suggested tags: attach to the family. Idempotent: ON CONFLICT DO NOTHING
    -- so admin-approved rows are never overwritten and Stock ID updates never
    -- clobber existing tags.
    IF _family_id IS NOT NULL
       AND _payload ? 'suggested_tags'
       AND jsonb_typeof(_payload->'suggested_tags') = 'array' THEN
      WITH ins AS (
        INSERT INTO public.product_tags(product_id, tag_id, source, confidence, approved, created_by)
        SELECT _family_id,
               COALESCE(t.id, public.resolve_tag_by_alias(s->>'key')),
               'import',
               NULLIF(s->>'confidence','')::numeric,
               false,
               _uid
        FROM jsonb_array_elements(_payload->'suggested_tags') s
        LEFT JOIN public.tags t
          ON t.key = public.normalize_tag_key(s->>'key') AND t.is_active
        WHERE COALESCE(t.id, public.resolve_tag_by_alias(s->>'key')) IS NOT NULL
        ON CONFLICT (product_id, tag_id) DO NOTHING
        RETURNING 1
      )
      SELECT count(*) INTO _tag_ins FROM ins;
      _tags_suggested := _tags_suggested + COALESCE(_tag_ins, 0);
    END IF;

    _after := jsonb_build_object(
      'brand_id', _brand_id, 'brand_created', _brand_created,
      'family_id', _family_id, 'variant_id', _variant_id,
      'tables', to_jsonb(_tables), 'ids', to_jsonb(_ids),
      'updated_ats', _updated_at_map
    );

    UPDATE public.import_batch_rows
    SET status='ok',
        action = CASE WHEN _payload->>'action' = 'update_variant' THEN 'update'::import_row_action
                      ELSE 'insert'::import_row_action END,
        target_table = CASE WHEN _payload->>'action' = 'update_variant' THEN 'products' ELSE 'product_variants' END,
        target_id = CASE WHEN _payload->>'action' = 'update_variant' THEN _family_id ELSE _variant_id END,
        target_updated_at_after_import = _last_updated_at,
        before_snapshot = _before,
        after_snapshot = _after
    WHERE id=_row.id;
  END LOOP;

  UPDATE public.import_batches SET
    status='succeeded',
    committed_at=now(),
    rollback_expires_at=now() + interval '7 days',
    totals = jsonb_build_object(
      'created_families', _created_families,
      'added_variants',   _added_variants,
      'updated_variants', _updated_variants,
      'skipped',          _skipped,
      'failed',           _failed,
      'tags_suggested',   _tags_suggested
    )
  WHERE id=_batch_id;

  RETURN jsonb_build_object(
    'ok', true,
    'created_families', _created_families,
    'added_variants',   _added_variants,
    'updated_variants', _updated_variants,
    'skipped',          _skipped,
    'failed',           _failed,
    'tags_suggested',   _tags_suggested
  );
END $function$;
