CREATE OR REPLACE FUNCTION public.guard_post_ownership() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
   IF auth.role() = 'authenticated' AND (OLD.status NOT IN ('draft','scheduled','failed') OR EXISTS(SELECT 1 FROM public.instagram_post_destinations WHERE post_id=OLD.id)) THEN RAISE EXCEPTION 'delivery_locked'; END IF;
   RETURN OLD;
 END IF;
 IF NEW.platform <> 'instagram' OR NEW.format NOT IN ('reels','feed','stories','image','carousel') THEN RAISE EXCEPTION 'unsupported_platform_or_format'; END IF;
 IF NEW.format IN ('image','carousel') AND NEW.status <> 'draft' THEN RAISE EXCEPTION 'draft_only_format'; END IF;
 IF NEW.video_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.videos WHERE id=NEW.video_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'media_owner'; END IF;
 IF NEW.instagram_account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.instagram_accounts WHERE id=NEW.instagram_account_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'account_owner'; END IF;
 IF NEW.details ? 'videoPath' AND NEW.details->>'videoPath' IS NOT NULL THEN
   IF split_part(NEW.details->>'videoPath','/',1) <> NEW.user_id::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='videos' AND name=NEW.details->>'videoPath') THEN RAISE EXCEPTION 'storage_owner'; END IF;
 END IF;
 IF NEW.details ? 'mediaPaths' THEN
   IF jsonb_typeof(NEW.details->'mediaPaths') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.details->'mediaPaths') > 20 THEN RAISE EXCEPTION 'invalid_media_paths'; END IF;
   IF NEW.format IN ('image','carousel') AND jsonb_array_length(NEW.details->'mediaPaths') = 0 THEN RAISE EXCEPTION 'media_required'; END IF;
   IF EXISTS(
     SELECT 1 FROM jsonb_array_elements_text(NEW.details->'mediaPaths') path
     WHERE split_part(path,'/',1) <> NEW.user_id::text
        OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='videos' AND name=path)
   ) THEN RAISE EXCEPTION 'storage_owner'; END IF;
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