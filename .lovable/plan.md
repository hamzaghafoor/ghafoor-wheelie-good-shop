
# Phase 1 — Admin CMS (real backend)

Lovable Cloud is now enabled. Everything below is real DB + auth, no mocks.

## 1. Database (one migration)

**Enums**
- `app_role` — `owner`, `admin`, `staff`
- `product_status` — `draft`, `published`, `archived`

**Tables (all in `public`, RLS on, GRANTs included)**

`profiles`
- `id uuid PK REFERENCES auth.users(id) ON DELETE CASCADE`
- `email text`, `full_name text`
- `must_change_password boolean NOT NULL DEFAULT true`
- `created_at`, `updated_at`
- Trigger `on_auth_user_created` → auto-insert profile row on signup

`user_roles` (roles separate from profile, per security rules)
- `id`, `user_id → auth.users`, `role app_role`, `unique(user_id, role)`
- `has_role(_user_id uuid, _role app_role)` SECURITY DEFINER function
- `is_admin(_user_id)` helper (returns true for `owner` or `admin`)
- Trigger `on_auth_user_created_grant_owner` → if `email = 'ghafoormotorssprt@gmail.com'` grant `owner` role

`tyre_products`
- `id uuid PK`, `brand`, `model`, `size text` (e.g. `195/65 R15`)
- `category` (Passenger/SUV/Hatchback/Commercial), `price numeric`, `currency text default 'PKR'`
- `in_stock boolean`, `image_url text`, `description text`, `features text[]`
- `status product_status NOT NULL DEFAULT 'draft'`
- `created_by`, timestamps

**RLS policies**
- `profiles`: user reads/updates own row; admins read all
- `user_roles`: user reads own roles; only owner can insert/update/delete
- `tyre_products`:
  - `SELECT` public/anon: `status = 'published'`
  - `SELECT` authenticated admin: all
  - `INSERT/UPDATE/DELETE` authenticated admin only (via `is_admin(auth.uid())`)

**Storage bucket** `tyre-images` (public read, admin write via policy).

## 2. Owner seeding

Migrations can't create `auth.users` cleanly. Approach:
- Trigger auto-grants `owner` role the moment `ghafoormotorssprt@gmail.com` signs up.
- Public `/auth` page has ONE sign-up gated to that email; everyone else gets `Sign-up disabled`.
- Owner sets any password on signup; `must_change_password=true` is set only on admin-invited accounts (Phase 2). First sign-in for owner directly opens `/admin`.

*(Alternative — create the account via `supabaseAdmin` server fn with a temp password and force-change flag. Downside: temp password would need to be shown once in chat. The signup-gated path is safer for the owner's own email.)*

## 3. Auth & routing

- `_authenticated/route.tsx` — integration-managed gate (already scaffolded when needed).
- `_admin.tsx` pathless layout under `_authenticated/` — checks `is_admin()` via a `requireSupabaseAuth` server fn; redirects non-admins to `/`.
- Routes:
  - `/auth` — sign in, forgot password link, one-time owner sign-up
  - `/reset-password` — public, handles Supabase `type=recovery` hash → `updateUser({ password })`
  - `/admin` — dashboard shell + tyre list
  - `/admin/tyres/new`, `/admin/tyres/$id` — editor
- Force password change: if `profile.must_change_password === true` after login, redirect to `/admin/change-password` before any admin work.

## 4. Admin UI (minimal, functional)

- **Tyre list**: table with brand/model/size/price/status, filter by status, actions: Edit, Publish/Unpublish, Archive.
- **Tyre editor**: form + image upload to `tyre-images` bucket, Save Draft / Publish buttons.
- Every mutation shows real success/error from the DB (no fake toasts).
- Archived rows kept, hidden from public.

## 5. Public site changes

- `/tyres` route: fetch `tyre_products WHERE status='published'` via a **public server fn** (publishable-key client, safe columns). Loader-fed for SSR/SEO.
- If zero published rows, render the empty-state block:
  > "Our online tyre catalogue is being updated. Tell us your vehicle or tyre size and our team will confirm today's available options and prices."
  With buttons: **Ask on WhatsApp**, **Call Ghafoor Motors**, **Find Tyres for My Car** (scrolls to `TyreFinder`).
- Delete/deprecate `src/lib/tyres.ts` demo data usage on `/tyres`. Tyre-guide/home cards that showed demo tyres get the same empty-state or are removed.

## 6. Verification checklist (I'll demo at the end)

1. Sign up with `ghafoormotorssprt@gmail.com` → auto-granted `owner`.
2. Visit `/admin` → dashboard loads. Non-owner emails get bounced.
3. Create a draft tyre → appears in admin list, NOT on `/tyres`.
4. Upload image → renders from Storage URL.
5. Publish → now appears on `/tyres`.
6. Archive → disappears from public, still in admin (Archived filter).
7. Refresh page → session persists, data still there.
8. Sign out → `/admin` redirects to `/auth`.
9. Forgot-password email → `/reset-password` updates password.

## Technical notes

- Server fns: `listPublishedTyres` (public, publishable key), `listAllTyres` / `upsertTyre` / `setTyreStatus` (protected via `requireSupabaseAuth` + `is_admin` check).
- `supabaseAdmin` only used inside handler bodies, never at module scope.
- Bearer middleware in `src/start.ts` already registered.
- No demo tyres shown publicly anywhere.
