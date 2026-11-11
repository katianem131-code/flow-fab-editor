REVOKE EXECUTE ON FUNCTION public.handle_new_user_billing() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_credits(integer, text) FROM anon;