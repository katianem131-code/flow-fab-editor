ALTER TABLE public.meta_oauth_states ADD COLUMN binding_hash text, ADD COLUMN session_id uuid, ADD COLUMN redirect_uri text, ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes');
REVOKE ALL ON public.meta_oauth_states FROM anon, authenticated;
DROP POLICY "Insert own state" ON public.meta_oauth_states;
CREATE OR REPLACE FUNCTION public.consume_meta_state(_id uuid, _binding text, _redirect text)
RETURNS SETOF public.meta_oauth_states LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 DELETE FROM public.meta_oauth_states s WHERE s.id = _id AND s.binding_hash = _binding AND s.redirect_uri = _redirect AND s.expires_at > now()
 AND EXISTS (SELECT 1 FROM auth.sessions a WHERE a.id = s.session_id AND a.user_id = s.user_id)
 RETURNING s.*;
$$;
REVOKE ALL ON FUNCTION public.consume_meta_state(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_meta_state(uuid,text,text) TO service_role;
ALTER TABLE public.instagram_tokens ADD COLUMN token_kind text NOT NULL DEFAULT 'page' CHECK (token_kind IN ('page','user','system_user')), ADD COLUMN expires_at timestamptz, ADD COLUMN data_access_expires_at timestamptz, ADD COLUMN revoked_at timestamptz;
REVOKE ALL ON public.instagram_tokens FROM anon, authenticated;
ALTER TABLE public.scheduled_posts ADD COLUMN lease_owner uuid, ADD COLUMN lease_until timestamptz;
CREATE TABLE public.instagram_post_destinations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 account_id uuid NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE RESTRICT,
 phase text NOT NULL DEFAULT 'pending' CHECK (phase IN ('pending','creating','processing','ready','sending','unknown','published','failed')),
 container_id text, media_id text, attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(), operation_started_at timestamptz, error_code text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(post_id, account_id)
);
GRANT SELECT ON public.instagram_post_destinations TO authenticated;
GRANT ALL ON public.instagram_post_destinations TO service_role;
ALTER TABLE public.instagram_post_destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own Instagram delivery" ON public.instagram_post_destinations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER ig_dest_updated BEFORE UPDATE ON public.instagram_post_destinations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ig_dest_due ON public.instagram_post_destinations(next_attempt_at) WHERE phase NOT IN ('published','failed');
CREATE OR REPLACE FUNCTION public.guard_post_ownership() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
   IF auth.role() = 'authenticated' AND (OLD.status NOT IN ('draft','scheduled','failed') OR EXISTS(SELECT 1 FROM public.instagram_post_destinations WHERE post_id=OLD.id)) THEN RAISE EXCEPTION 'delivery_locked'; END IF;
   RETURN OLD;
 END IF;
 IF NEW.platform <> 'instagram' OR NEW.format NOT IN ('reels','feed','stories') THEN RAISE EXCEPTION 'unsupported_platform_or_format'; END IF;
 IF NEW.video_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.videos WHERE id=NEW.video_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'media_owner'; END IF;
 IF NEW.instagram_account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.instagram_accounts WHERE id=NEW.instagram_account_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'account_owner'; END IF;
 IF NEW.details ? 'videoPath' AND NEW.details->>'videoPath' IS NOT NULL THEN
  IF split_part(NEW.details->>'videoPath','/',1) <> NEW.user_id::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='videos' AND name=NEW.details->>'videoPath') THEN RAISE EXCEPTION 'storage_owner'; END IF;
 END IF;
 IF NEW.details ? 'accountIds' THEN
  IF jsonb_typeof(NEW.details->'accountIds') <> 'array' OR jsonb_array_length(NEW.details->'accountIds') > 20 THEN RAISE EXCEPTION 'invalid_targets'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(NEW.details->'accountIds') x WHERE NOT EXISTS(SELECT 1 FROM public.instagram_accounts WHERE id::text=x AND user_id=NEW.user_id)) THEN RAISE EXCEPTION 'target_owner'; END IF;
 END IF;
 IF auth.role() = 'authenticated' THEN
  IF TG_OP='UPDATE' AND (OLD.status NOT IN ('draft','scheduled','failed') OR EXISTS(SELECT 1 FROM public.instagram_post_destinations WHERE post_id=OLD.id)) THEN RAISE EXCEPTION 'delivery_locked'; END IF;
  IF NEW.status NOT IN ('draft','scheduled','publishing') OR NEW.lease_owner IS NOT NULL OR NEW.lease_until IS NOT NULL OR NEW.creation_id IS NOT NULL OR NEW.instagram_media_id IS NOT NULL OR NEW.published_at IS NOT NULL THEN RAISE EXCEPTION 'server_delivery_fields'; END IF;
  IF NEW.status='publishing' THEN NEW.status='scheduled'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_post BEFORE INSERT OR UPDATE OR DELETE ON public.scheduled_posts FOR EACH ROW EXECUTE FUNCTION public.guard_post_ownership();
CREATE OR REPLACE FUNCTION public.claim_instagram_post(_worker uuid)
RETURNS SETOF public.scheduled_posts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.scheduled_posts; ids jsonb;
BEGIN
 SELECT s.* INTO p FROM public.scheduled_posts s WHERE s.platform='instagram' AND s.status IN ('scheduled','publishing') AND s.scheduled_for <= now()
 AND (s.lease_until IS NULL OR s.lease_until < now())
 AND (NOT EXISTS(SELECT 1 FROM public.instagram_post_destinations d WHERE d.post_id=s.id)
 OR EXISTS(SELECT 1 FROM public.instagram_post_destinations d WHERE d.post_id=s.id AND d.phase NOT IN ('published','failed') AND d.next_attempt_at<=now()))
 ORDER BY s.scheduled_for FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.instagram_post_destinations WHERE post_id=p.id) THEN
  ids := p.details->'accountIds';
  IF ids IS NULL AND p.instagram_account_id IS NOT NULL THEN ids:=jsonb_build_array(p.instagram_account_id::text); END IF;
  -- Legacy handles are deliberately not resolved: user must reselect stable account IDs.
  IF ids IS NULL OR jsonb_typeof(ids)<>'array' OR jsonb_array_length(ids)=0 THEN
   UPDATE public.scheduled_posts SET status='failed', error_message='Reselecione as contas conectadas para este post.' WHERE id=p.id; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(ids) x WHERE NOT EXISTS(SELECT 1 FROM public.instagram_accounts WHERE id::text=x AND user_id=p.user_id)) THEN
   UPDATE public.scheduled_posts SET status='failed', error_message='Conta não pertence ao usuário.' WHERE id=p.id; RETURN;
  END IF;
  INSERT INTO public.instagram_post_destinations(post_id,user_id,account_id) SELECT p.id,p.user_id,x::uuid FROM jsonb_array_elements_text(ids) x ON CONFLICT DO NOTHING;
 END IF;
 UPDATE public.instagram_post_destinations SET phase='unknown', error_code='interrupted_write' WHERE post_id=p.id AND phase IN ('creating','sending');
 RETURN QUERY UPDATE public.scheduled_posts SET lease_owner=_worker, lease_until=now()+interval '120 seconds', status='publishing' WHERE id=p.id RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.claim_instagram_post(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_instagram_post(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.advance_instagram_destination(_post uuid,_worker uuid,_destination uuid,_expected text,_patch jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.scheduled_posts;
BEGIN
 SELECT * INTO p FROM public.scheduled_posts WHERE id=_post FOR UPDATE;
 IF NOT FOUND OR p.lease_owner IS DISTINCT FROM _worker OR p.lease_until<=now() THEN RETURN false; END IF;
 UPDATE public.instagram_post_destinations SET phase=COALESCE(_patch->>'phase',phase), container_id=COALESCE(_patch->>'container_id',container_id),media_id=COALESCE(_patch->>'media_id',media_id),
 error_code=_patch->>'error_code', attempts=attempts+1, operation_started_at=now(), next_attempt_at=COALESCE((_patch->>'next_attempt_at')::timestamptz,now()+interval '1 minute')
 WHERE id=_destination AND post_id=_post AND user_id=p.user_id AND phase=_expected;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.advance_instagram_destination(uuid,uuid,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advance_instagram_destination(uuid,uuid,uuid,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.release_instagram_post(_post uuid,_worker uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.scheduled_posts; pending boolean; problem boolean;
BEGIN
 SELECT * INTO p FROM public.scheduled_posts WHERE id=_post FOR UPDATE;
 IF NOT FOUND OR p.lease_owner IS DISTINCT FROM _worker OR p.lease_until<=now() THEN RETURN false; END IF;
 SELECT bool_or(phase NOT IN ('published','failed','unknown')),bool_or(phase IN ('failed','unknown')) INTO pending,problem FROM public.instagram_post_destinations WHERE post_id=_post;
 UPDATE public.scheduled_posts SET lease_owner=NULL,lease_until=NULL,status=CASE WHEN pending THEN 'publishing' WHEN problem THEN 'failed' ELSE 'published' END,
 published_at=CASE WHEN NOT pending AND NOT problem THEN now() ELSE published_at END,
 error_message=CASE WHEN problem THEN 'Um destino falhou ou exige reconciliação; destinos concluídos não serão repetidos.' ELSE NULL END WHERE id=_post;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.release_instagram_post(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_instagram_post(uuid,uuid) TO service_role;
-- Reference-level owner protections for existing media rows and updates.
DROP POLICY "Own videos" ON public.videos;
CREATE POLICY "Own videos" ON public.videos FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id AND (batch_id IS NULL OR EXISTS(SELECT 1 FROM public.batches b WHERE b.id=batch_id AND b.user_id=auth.uid())) AND (storage_path IS NULL OR split_part(storage_path,'/',1)=auth.uid()::text));
DROP POLICY "Users update own video files" ON storage.objects;
CREATE POLICY "Users update own video files" ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='videos' AND (storage.foldername(name))[1]=auth.uid()::text) WITH CHECK(bucket_id='videos' AND (storage.foldername(name))[1]=auth.uid()::text);
