
# Stage A — Independent Website CMS (no ERP)

Extending the existing admin. Everything below is real DB + auth, all publicly-visible data comes from the database. No mocks, no fake toasts.

## 1. Database (single migration)

**New enums**
- `price_mode` — `fixed`, `confirm_today`, `on_request`, `starting_from`, `hidden`
- `availability_status` — `in_stock`, `limited`, `check`, `out_of_stock`, `on_order`, `discontinued`
- `section_type` — `hero`, `announcement`, `trust_strip`, `tyre_finder`, `featured_brands`, `featured_tyres`, `vehicle_categories`, `services_grid`, `promo_banner`, `image_text`, `why_us`, `reviews`, `articles`, `faq`, `location`, `contact_cta`, `whatsapp_cta`, `custom_text`
- `content_status` — `draft`, `published`, `scheduled`, `archived`

**New tables** (all in `public`, RLS on, GRANTs included)

- `brands` — name (unique-normalized), slug, logo_url, country, description, is_featured, is_active, display_order, status, timestamps, created_by
- `tyre_models` — brand_id FK, name, code, short_desc, full_desc, vehicle_categories text[], driving_characteristics text[], warranty, is_featured, internal_notes, images jsonb (main/tread/sidewall/extra with alt), status, timestamps
- `tyre_variants` — model_id FK, width int, profile int, rim numeric, size_format text default 'metric', normalized_size text (generated `195/65 R15`), price_mode, price numeric, previous_price numeric, price_note, price_verified_at, price_verified_by, availability, availability_verified_at, availability_verified_by, load_index, speed_rating, tubeless, run_flat, xl_reinforced, ply_rating, manufacturing_country, warranty, public_notes, private_notes, status, timestamps, `unique(model_id, normalized_size)`
- `media_assets` — path, url, category, alt_text, filename, mime, size_bytes, uploaded_by, archived, timestamps
- `homepage_sections` — type section_type, name (internal), config jsonb (safe, schema-validated per type), display_order, is_visible, status, start_at, end_at, updated_by, timestamps
- `section_revisions` — section_id FK, config jsonb, status, saved_by, created_at
- `business_info` — singleton row (id fixed uuid), name, logo_url, phone, whatsapp, email, address, maps_url, hours jsonb, holiday_hours jsonb, temp_closure, facebook, instagram, google_review_url, currency, timezone, updated_by
- `activity_log` — user_id, action, entity_type, entity_id, before jsonb, after jsonb, created_at

**RLS**
- Public SELECT (`TO anon, authenticated`): `brands` where `is_active AND status='published' AND NOT archived`; `tyre_models` where `status='published'`; `tyre_variants` where `status='published'`; `homepage_sections` where `is_visible AND status='published' AND (start_at IS NULL OR now()>=start_at) AND (end_at IS NULL OR now()<=end_at)`; `business_info` full row; `media_assets` NO anon (served via signed URLs referenced from published rows only).
- Admin full CRUD via `is_admin(auth.uid())`.
- `activity_log`, `section_revisions`: admin read; inserts via triggers/server fns.

**Triggers**
- `set_updated_at` on all editable tables.
- Log inserts/updates on `brands`, `tyre_variants` (price/availability), `homepage_sections`, `business_info` into `activity_log`.
- On `homepage_sections` UPDATE with status change → insert into `section_revisions`.

**Storage bucket**
- Reuse `tyre-images` (rename purpose to shared) OR add `media` (private, admin write, signed URLs). Prefer adding `media` bucket for clarity.

**Seed**
- One `business_info` row.
- Default `homepage_sections` matching current hard-coded homepage (hero, trust strip, tyre finder, featured brands, featured tyres, services grid, location, contact cta) in `published` status — so public site keeps rendering the same content the moment we swap to DB-driven.

## 2. Server functions

`src/lib/brands.functions.ts`
- `listBrandsAdmin`, `upsertBrand`, `setBrandActive`, `setBrandFeatured`, `reorderBrands`, `archiveBrand`
- `listBrandsPublic` (publishable key, safe cols)

`src/lib/tyres.functions.ts` (extend)
- `listTyresAdmin` with brand/model tree, `getTyreVariantAdmin`, `upsertTyreModel`, `upsertTyreVariant`, `duplicateVariant`, `quickUpdatePrice`, `priceStillCorrect`, `quickUpdateAvailability`, `setVariantStatus`, `archiveVariant`
- `checkDuplicateVariant({ brandId, modelName, normalizedSize })`
- Public: `listPublishedTyres` returns brand+model+variants (fresh price/availability with derived `freshness` flag)

`src/lib/sections.functions.ts`
- `listSectionsAdmin`, `getSectionAdmin`, `upsertSection`, `reorderSections`, `duplicateSection`, `setSectionVisible`, `setSectionStatus`, `scheduleSection`, `archiveSection`, `restoreSectionRevision`
- Public: `listPublishedHomepageSections`

`src/lib/media.functions.ts`
- `listMediaAdmin`, `upsertMediaMetadata`, `archiveMedia`, `signedUrlFor(path)`

`src/lib/business.functions.ts`
- `getBusinessInfo` (public), `updateBusinessInfo` (admin)

All admin fns use `requireSupabaseAuth` + `is_admin` check. Public fns use server publishable client with the anon SELECT policies above. All mutations write to `activity_log` (via DB trigger primarily).

## 3. Admin UI

**Layout** — replace top nav with a sidebar (`components/admin/AdminSidebar.tsx`):

```
Overview
Catalogue
  Tyres
  Brands
  Media Library
Website
  Homepage Sections
  Website Pages           (Phase 2 stub card)
  Navigation              (Phase 2 stub)
  Announcement Bar        (Phase 2 stub)
  Footer                  (Phase 2 stub)
  SEO                     (Phase 2 stub)
Customer Activity         (all Phase 2 stubs)
Settings
  Business Information
  Users & Roles           (Phase 2 stub)
  Integrations            (Phase 2 stub)
  Activity Log            (read-only list, real data)
```

Phase 2 items render a friendly "Coming in a later phase" card — no fake controls.

**Routes added**
- `_authenticated/admin/brands.index.tsx`, `brands.new.tsx`, `brands.$id.tsx`
- `_authenticated/admin/tyres.index.tsx` (rewrite: brand→model→variant tree with quick-action drawer)
- `_authenticated/admin/tyres.new.tsx` (7-step wizard)
- `_authenticated/admin/tyres.$id.tsx` (edit variant; access wizard steps as tabs)
- `_authenticated/admin/media.index.tsx`
- `_authenticated/admin/sections.index.tsx` (cards + drag reorder + up/down)
- `_authenticated/admin/sections.$id.tsx` (per-type editor)
- `_authenticated/admin/business.tsx`
- `_authenticated/admin/activity.tsx`
- Preview surface: `_authenticated/admin/preview.home.tsx?draft=<id>` — renders `Home` component using draft section list.

**Wizard** (`components/admin/tyre-wizard/`)
- Stepper: Brand → Model → Size → Price/Availability → Specs → Images → Preview
- Persists a `draft` variant row on every "Save & Continue"; resume by opening draft.
- Unsaved-changes guard using router `useBlocker`.
- Size selector: three dropdowns (width/profile/rim) built from `data/tyre-sizes.ts` + free-search input that normalizes any of the accepted formats to `NNN/NN RNN`. "Add missing value" prompts free entry after confirmation. Duplicate check on blur.

**Quick drawer** (`components/admin/QuickVariantDrawer.tsx`)
- Update Price, Price Still Correct, Change Availability, Add Another Size, Preview, Publish/Unpublish, Duplicate, Archive.
- All operations optimistic + invalidate queries.

**Section editor** (`components/admin/sections/`)
- One React component per section type, each rendering safe fields only (no raw HTML/CSS). Rich-text sections use a limited toolbar (tiptap StarterKit restricted to bold/italic/link/lists).
- Approved background/layout/spacing selects with fixed options.
- Save Draft / Preview / Publish / Schedule / Archive.
- Reorder list with dnd-kit + up/down buttons.

## 4. Public site

- Home page becomes a renderer over `listPublishedHomepageSections()` — one React component per section type mapping to existing designs. Loader-fed for SSR/SEO. If a section is missing, skip.
- `/tyres` reads from `listPublishedTyres()` grouped by brand→model. Price display honours `price_mode` and freshness (>14 days → force "Confirm Today's Price" + WhatsApp CTA). Availability >14 days → "Check Availability".
- Featured Brands / Featured Tyres sections read from DB via their config filters.
- Draft/archived/scheduled-not-active content never leaks (enforced by RLS + freshness logic in the public server fn).

## 5. Verification (Stage A acceptance)

Walk through the 25-step demo end-to-end after implementation, using real DB rows and page refreshes.

## Technical notes

- All new server fns follow `.middleware([requireSupabaseAuth])` pattern for admin; public ones use the publishable-key server client with the `fetch` shim already in the codebase.
- All `CREATE TABLE` statements include GRANTs to `authenticated` + `service_role`, plus `anon` only for public-safe tables.
- `supabaseAdmin` is only used inside handler bodies, never for reads.
- No changes to `client.ts`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `types.ts`, or `.env`.
- Design tokens unchanged — sidebar and editors use existing `card-surface`, `btn-primary`, `btn-outline` classes.
- Adds dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`.

This is roughly 25–30 files of new code plus one migration. I'll build it in the order in the "Implementation order" section of your brief and stop for approval at the end of Stage A.
