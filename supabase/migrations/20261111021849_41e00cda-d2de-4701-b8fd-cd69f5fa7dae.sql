CREATE OR REPLACE FUNCTION public.consume_meta_state(_id uuid, _binding text, _redirect text)
RETURNS SETOF public.meta_oauth_states LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 DELETE FROM public.meta_oauth_states s WHERE s.id=_id AND s.binding_hash=_binding AND s.redirect_uri=_redirect AND s.expires_at>now()
 AND EXISTS(SELECT 1 FROM auth.sessions a WHERE a.id=s.session_id AND a.user_id=s.user_id AND (a.not_after IS NULL OR a.not_after>now())) RETURNING s.*;
$$;
CREATE OR REPLACE FUNCTION public.claim_instagram_post(_worker uuid)
RETURNS SETOF public.scheduled_posts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.scheduled_posts; ids jsonb;
BEGIN
 SELECT s.* INTO p FROM public.scheduled_posts s WHERE s.platform='instagram' AND s.status IN ('scheduled','publishing') AND s.scheduled_for<=now() AND (s.lease_until IS NULL OR s.lease_until<now())
 AND (NOT EXISTS(SELECT 1 FROM public.instagram_post_destinations d WHERE d.post_id=s.id) OR EXISTS(SELECT 1 FROM public.instagram_post_destinations d WHERE d.post_id=s.id AND d.phase NOT IN ('published','failed') AND d.next_attempt_at<=now() AND (d.phase<>'unknown' OR (d.container_id IS NOT NULL AND d.attempts<8))))
 ORDER BY s.scheduled_for FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.instagram_post_destinations WHERE post_id=p.id) THEN
  ids:=p.details->'accountIds';
  IF ids IS NULL AND p.instagram_account_id IS NOT NULL THEN ids:=jsonb_build_array(p.instagram_account_id::text); END IF;
  IF ids IS NULL OR jsonb_typeof(ids)<>'array' OR jsonb_array_length(ids)=0 THEN UPDATE public.scheduled_posts SET status='failed',error_message='Reselecione as contas conectadas para este post.' WHERE id=p.id; RETURN; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(ids) x WHERE NOT EXISTS(SELECT 1 FROM public.instagram_accounts WHERE id::text=x AND user_id=p.user_id)) THEN UPDATE public.scheduled_posts SET status='failed',error_message='Conta não pertence ao usuário.' WHERE id=p.id; RETURN; END IF;
  INSERT INTO public.instagram_post_destinations(post_id,user_id,account_id) SELECT p.id,p.user_id,x::uuid FROM jsonb_array_elements_text(ids) x ON CONFLICT DO NOTHING;
 END IF;
 UPDATE public.instagram_post_destinations SET phase='unknown',error_code='interrupted_write' WHERE post_id=p.id AND phase IN ('creating','sending');
 RETURN QUERY UPDATE public.scheduled_posts SET lease_owner=_worker,lease_until=now()+interval '120 seconds',status='publishing' WHERE id=p.id RETURNING *;
END $$;
CREATE OR REPLACE FUNCTION public.release_instagram_post(_post uuid,_worker uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.scheduled_posts; pending boolean; problem boolean;
BEGIN
 SELECT * INTO p FROM public.scheduled_posts WHERE id=_post FOR UPDATE;
 IF NOT FOUND OR p.lease_owner IS DISTINCT FROM _worker OR p.lease_until<=now() THEN RETURN false; END IF;
 SELECT bool_or(phase NOT IN ('published','failed','unknown') OR (phase='unknown' AND container_id IS NOT NULL AND attempts<8)),bool_or(phase IN ('failed','unknown')) INTO pending,problem FROM public.instagram_post_destinations WHERE post_id=_post;
 UPDATE public.scheduled_posts SET lease_owner=NULL,lease_until=NULL,status=CASE WHEN pending THEN 'publishing' WHEN problem THEN 'failed' ELSE 'published' END,
 published_at=CASE WHEN NOT pending AND NOT problem THEN now() ELSE published_at END,
 error_message=CASE WHEN problem THEN 'Um destino falhou ou exige reconciliação; destinos concluídos não serão repetidos.' ELSE NULL END WHERE id=_post;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.consume_meta_state(uuid,text,text),public.claim_instagram_post(uuid),public.release_instagram_post(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_meta_state(uuid,text,text),public.claim_instagram_post(uuid),public.release_instagram_post(uuid,uuid) TO service_role;