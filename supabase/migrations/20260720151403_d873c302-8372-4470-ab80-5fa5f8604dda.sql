
-- Fix admin-write RLS: require is_admin(auth.uid())
DROP POLICY IF EXISTS reviews_auth_write ON public.reviews;
DROP POLICY IF EXISTS reviews_auth_read  ON public.reviews;
DROP POLICY IF EXISTS articles_auth_write ON public.articles;
DROP POLICY IF EXISTS articles_auth_read  ON public.articles;
DROP POLICY IF EXISTS videos_auth_write   ON public.videos;
DROP POLICY IF EXISTS videos_auth_read    ON public.videos;

-- REVIEWS
CREATE POLICY reviews_admin_select ON public.reviews FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY reviews_admin_insert ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY reviews_admin_update ON public.reviews FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY reviews_admin_delete ON public.reviews FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ARTICLES
CREATE POLICY articles_admin_select ON public.articles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY articles_admin_insert ON public.articles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY articles_admin_update ON public.articles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY articles_admin_delete ON public.articles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- VIDEOS
CREATE POLICY videos_admin_select ON public.videos FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY videos_admin_insert ON public.videos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY videos_admin_update ON public.videos FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY videos_admin_delete ON public.videos FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Google reviews must have HTTPS google source URL and non-trivial body
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_google_requires_url,
  ADD CONSTRAINT reviews_google_requires_url CHECK (
    source <> 'google' OR (
      external_url IS NOT NULL
      AND external_url ~* '^https://(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|g\.page|search\.google\.[a-z.]+)/'
      AND char_length(btrim(body)) >= 10
    )
  );

-- Videos: restrict provider to youtube/vimeo only
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_provider_check;
ALTER TABLE public.videos
  ADD CONSTRAINT videos_provider_check CHECK (provider IN ('youtube','vimeo'));

-- Videos: video_ref must be a bare ID (no HTML, no scheme, no whitespace/angle brackets)
ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_ref_safe,
  ADD CONSTRAINT videos_ref_safe CHECK (
    video_ref ~ '^[A-Za-z0-9_-]{6,64}$'
  );
