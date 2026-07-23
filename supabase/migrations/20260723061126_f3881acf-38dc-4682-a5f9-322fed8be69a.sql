
REVOKE EXECUTE ON FUNCTION public.resolve_tag_by_alias(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.effective_variant_tag_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_tag_by_alias(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.effective_variant_tag_ids(uuid) TO authenticated, service_role;
