ALTER TABLE public.catalogue_settings
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_calendly_url text,
  ADD COLUMN IF NOT EXISTS service_calendly_links jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.catalogue_settings
  DROP CONSTRAINT IF EXISTS catalogue_settings_calendly_url_https;
ALTER TABLE public.catalogue_settings
  ADD CONSTRAINT catalogue_settings_calendly_url_https
  CHECK (default_calendly_url IS NULL OR default_calendly_url ~* '^https://([a-z0-9-]+\.)*calendly\.com/');