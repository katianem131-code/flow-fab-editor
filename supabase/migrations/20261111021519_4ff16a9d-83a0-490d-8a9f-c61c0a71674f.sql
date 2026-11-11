REVOKE ALL ON FUNCTION public.guard_post_ownership() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_post_ownership() TO service_role;