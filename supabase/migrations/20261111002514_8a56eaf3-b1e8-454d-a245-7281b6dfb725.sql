ALTER TABLE public.batches ADD COLUMN details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.scheduled_posts ADD COLUMN details jsonb NOT NULL DEFAULT '{}'::jsonb;