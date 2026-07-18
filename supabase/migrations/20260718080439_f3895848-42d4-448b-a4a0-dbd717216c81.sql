
CREATE POLICY "tyre_images_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'tyre-images' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'tyre-images' AND public.is_admin(auth.uid()));

-- Allow anon read via signed URL only (no direct list); we generate signed URLs server-side.
CREATE POLICY "tyre_images_public_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'tyre-images');
