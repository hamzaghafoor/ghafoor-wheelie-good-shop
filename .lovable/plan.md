
# Stage B — Complete Tyre Catalogue Experience

Approved Stage A foundations stay untouched (generic products, categories, vehicle registry, brands, media, RLS). This stage completes the tyre journey end-to-end.

---

## 1. Schema additions (additive migration, one file)

New tables (all with RLS + GRANTs, public-read for options, admin-write, `updated_at` trigger):

- `tyre_size_options` — `dimension` enum (`width`|`profile`|`rim`), `value` int, `label` text, `archived` bool. Seeded with widths 145–335, profiles 25–85, rims 12–24.
- `leads` — `name`, `phone`, `message`, `preferred_contact` (`whatsapp`|`call`|`either`), `tyre_size`, `vehicle_make`, `vehicle_model`, `vehicle_year`, `source_page`, `search_context` jsonb, `variant_id` fk nullable, `model_id` fk nullable, `status` enum (`new`|`contacted`|`qualified`|`closed`|`lost`), `admin_notes`, `created_at`. Insert allowed to `anon` + `authenticated`; select/update admin only.
- `analytics_events` — `event_name`, `payload` jsonb, `session_id`, `page`, `created_at`. Insert allowed to `anon`; select admin only. (Central store for future GA/Meta forwarding.)

Additive columns:

- `tyre_models`: `pattern_name`, `tyre_type` enum (`passenger`|`suv_4x4`|`commercial`|`other`), `origin_country`, `warranty_text`, `recommended_use` text[], `is_featured` bool.
- `tyre_variants`: `width` int, `profile` int, `rim` int, `tube_type` enum (`tubeless`|`tube_type`|`unspecified`), `availability_note`.
  Backfill `width/profile/rim` by parsing existing `normalized_size`. Add unique index on `(model_id, width, profile, rim, load_index, speed_rating)` — partial where not archived.
- `brands`: unique lowercased name index to block accidental duplicates.

Compatibility already covered by existing `tyre_model_vehicle_compat`; add a matching `tyre_variant_vehicle_compat` table for variant-level overrides (same shape, RLS parity).

---

## 2. Admin — Tyre Wizard rebuild

`src/components/admin/TyreWizard.tsx` becomes a stepper:

1. **Brand** — searchable select of tyres-category brands; inline "+ New brand" popover; duplicate check by normalized name.
2. **Model** — name, pattern, tyre_type, origin, warranty, short_desc, features (chips), recommended_use (chips), featured toggle. Duplicate check `(brand_id, name)`.
3. **Variants** — repeater with structured Width/Profile/Rim comboboxes (searchable, driven by `tyre_size_options`, with "Add missing value" inline). Load index, speed rating, XL, run-flat, tube type, price, price_display, availability, availability_note. Auto-computes normalized_size. Duplicate check per row.
4. **Compatibility** — Make → Model → Years multiselect; bulk assign to model or specific variants; year-range shortcut; chips list with remove. Disclaimer banner: "Guidance only — please confirm before fitting."
5. **Media** — primary image + gallery, drag-reorder (dnd-kit), alt text, replace/remove, client-side compression via `browser-image-compression`, upload through existing signed URL flow to `tyre-images`.
6. **Public info** — review short description, features, warranty; SEO title/desc override (optional).
7. **Preview** — renders the actual public detail-page component with current draft data.
8. **Publish** — validation gate (see §6). Save Draft always allowed; Publish requires all checks green.

Cross-cutting: autosave draft every 15s + on step change; `beforeunload` warning on dirty state; per-field inline errors; **Duplicate Model** and **Duplicate Variant** actions in list view; archive-with-confirm; list page preserves filters in URL search params.

---

## 3. Public tyre finder (`/tyres`)

Two tabs above results:

- **By Size** — Width → Profile → Rim cascading selects (only shows values that have live variants).
- **By Vehicle** — Make → Model → Year cascading selects.

Sidebar filters: Brand, Availability, Tyre type, Run-flat, Price range (only rendered if ≥1 result has visible price). Active filter chips + Reset. URL-synced via `validateSearch`.

Zero-results state: friendly "Let our tyre expert find it for you" card with prefilled WhatsApp deep link and inline lead form.

---

## 4. Tyre detail page (`/tyres/$modelSlug`)

New route. Gallery (thumbnails + main), brand/model, size selector chips (switching updates price/availability/specs client-side via state, no reload), specs table, compatible vehicles list, features, availability badge, price per display setting, sticky Call + WhatsApp CTAs, compatibility disclaimer.

---

## 5. WhatsApp helper

`src/lib/whatsapp.ts` — `buildTyreMessage({brand, model, size, vehicle?, url})` used everywhere. Never emits a bare "Hi".

---

## 6. Validation rules (published tyres)

Enforced in wizard + server function:
- Brand assigned, model name, tyre_type, short_desc.
- ≥1 variant with valid width/profile/rim.
- Primary image present.
- Availability set on every variant.
- No duplicate variants.

Draft may skip any of the above.

---

## 7. Leads

- `/admin/leads` — table (New/Contacted/Qualified/Closed/Lost tabs), row drawer with search context, product link, notes, status change, WhatsApp/Call buttons.
- Public lead form component reused on: no-results state, detail page "Ask expert", chatbot fallback (already wired — repoint its storage to this table).

---

## 8. Analytics helper

`src/lib/analytics.ts` — single `track(event, payload)` that writes to `analytics_events` and (later) forwards to GA/Meta when IDs are set in `business_info`. Events fired: `tyre_size_search`, `vehicle_search`, `tyre_view`, `whatsapp_click`, `call_click`, `lead_submitted`, `no_results`.

---

## Technical notes

- New server-fn files in `src/lib/`: `tyre-options.functions.ts`, `leads.functions.ts`, `analytics.functions.ts`, extend `catalogue.functions.ts` with `getTyreModelPublic(slug)` and compatibility upserts.
- Image compression: `bun add browser-image-compression @dnd-kit/core @dnd-kit/sortable`.
- Storage bucket `tyre-images` stays private; continue serving via signed URLs (existing pattern).
- All admin routes stay under `_authenticated/`; `/admin/leads` gated by admin role check inside handler.
- Additive only; no data loss; existing variants keep working (backfilled width/profile/rim).

---

## Build order

1. Migration (schema + seeds + backfill).
2. Tyre-size options admin + wizard rebuild.
3. Compatibility step + variant-level compat table wiring.
4. Media step (compression + reorder).
5. Public finder rebuild + detail page + WhatsApp helper.
6. Leads table + `/admin/leads` + lead form component.
7. Analytics helper + event wiring.
8. End-to-end journey test on desktop + mobile viewports.

Approve and I'll run the migration first, then build in the order above.
