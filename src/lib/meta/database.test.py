"""Run against a disposable PostgreSQL only: python3 src/lib/meta/database.test.py.
Never uses project credentials or hosted database connections.
"""
import concurrent.futures
import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[3]
USER = '00000000-0000-0000-0000-000000000001'
OTHER = '00000000-0000-0000-0000-000000000002'
POST = '00000000-0000-0000-0000-000000000010'
ACCOUNT = '00000000-0000-0000-0000-000000000020'
WORKER = '00000000-0000-0000-0000-000000000030'

def sql(query, check=True):
    result = subprocess.run(['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', '55432', '-U', 'lovable', '-d', 'postgres'], input=query, text=True, capture_output=True)
    if check and result.returncode:
        raise AssertionError(result.stderr)
    return result

def bootstrap():
    sql("""
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id uuid primary key);
    CREATE TABLE auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'service_role') $$;
    CREATE TABLE storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users update own video files" ON storage.objects FOR UPDATE TO authenticated USING(true);
    CREATE TABLE public.batches(id uuid primary key,user_id uuid);
    CREATE TABLE public.videos(id uuid primary key,user_id uuid,batch_id uuid,storage_path text);
    ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Own videos" ON public.videos FOR ALL TO authenticated USING(user_id=auth.uid());
    CREATE TABLE public.instagram_accounts(id uuid primary key,user_id uuid,ig_user_id text);
    CREATE TABLE public.instagram_tokens(account_id uuid,access_token text);
    CREATE TABLE public.meta_oauth_states(id uuid primary key,user_id uuid,return_to text,created_at timestamptz default now());
    CREATE POLICY "Insert own state" ON public.meta_oauth_states FOR INSERT TO authenticated WITH CHECK(true);
    CREATE TABLE public.scheduled_posts(id uuid primary key,user_id uuid,video_id uuid,instagram_account_id uuid,platform text default 'instagram',format text default 'reels',status text,scheduled_for timestamptz,details jsonb default '{}',creation_id text,instagram_media_id text,published_at timestamptz,error_message text);
    CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated;
    """)
    for filename in ['20261111021446_a9151733-ff6f-4ce1-bf98-418fa0d4007b.sql', '20261111021519_4ff16a9d-83a0-490d-8a9f-c61c0a71674f.sql', '20261111021849_41e00cda-d2de-4701-b8fd-cd69f5fa7dae.sql']:
        sql((ROOT / 'supabase/migrations' / filename).read_text())
    sql(f"INSERT INTO auth.users VALUES ('{USER}'),('{OTHER}'); INSERT INTO public.instagram_accounts VALUES ('{ACCOUNT}','{USER}','ig');")

class DatabaseSafety(unittest.TestCase):
    def setUp(self):
        sql('TRUNCATE public.instagram_post_destinations, public.scheduled_posts, public.meta_oauth_states,auth.sessions;')

    def post(self):
        sql(f"INSERT INTO public.scheduled_posts(id,user_id,status,scheduled_for,details) VALUES ('{POST}','{USER}','scheduled',now()-interval '1 minute','{{\"accountIds\":[\"{ACCOUNT}\"]}}');")

    def test_concurrent_claim_and_fencing(self):
        self.post()
        query = f"BEGIN; SELECT count(*) FROM public.claim_instagram_post('{WORKER}'); SELECT pg_sleep(0.3); COMMIT;"
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            values = list(pool.map(lambda _: sql(query).stdout.strip(), range(2)))
        self.assertEqual(sorted(v.splitlines()[0] for v in values), ['0', '1'])
        result = sql(f"SELECT public.advance_instagram_destination('{POST}','{OTHER}',id,'pending','{{\"phase\":\"creating\"}}') FROM public.instagram_post_destinations;")
        self.assertEqual(result.stdout.strip(), 'f')

    def test_state_replay_session_and_redirect(self):
        sql(f"INSERT INTO auth.sessions VALUES ('{WORKER}','{USER}',now()+interval '1 hour'); INSERT INTO public.meta_oauth_states(id,user_id,binding_hash,session_id,redirect_uri) VALUES ('{POST}','{USER}','test-binding','{WORKER}','https://flow-fab-editor.lovable.app/api/public/meta/callback');")
        for binding, redirect in [('wrong', 'https://flow-fab-editor.lovable.app/api/public/meta/callback'), ('test-binding','https://evil.test')]:
            self.assertEqual(sql(f"SELECT count(*) FROM public.consume_meta_state('{POST}','{binding}','{redirect}');").stdout.strip(),'0')
        query = f"SELECT count(*) FROM public.consume_meta_state('{POST}','test-binding','https://flow-fab-editor.lovable.app/api/public/meta/callback');"
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            self.assertEqual(sorted(pool.map(lambda _: sql(query).stdout.strip(), range(2))), ['0','1'])

    def test_expired_and_signed_out_state(self):
        sql(f"INSERT INTO public.meta_oauth_states(id,user_id,binding_hash,session_id,redirect_uri,expires_at) VALUES ('{POST}','{USER}','test','{WORKER}','redirect',now()-interval '1 second');")
        self.assertEqual(sql(f"SELECT count(*) FROM public.consume_meta_state('{POST}','test','redirect');").stdout.strip(),'0')
        sql(f"UPDATE public.meta_oauth_states SET expires_at=now()+interval '10 minutes';")
        self.assertEqual(sql(f"SELECT count(*) FROM public.consume_meta_state('{POST}','test','redirect');").stdout.strip(),'0')

    def test_owner_rls_and_cross_user_targets(self):
        self.post(); sql(f"SELECT public.claim_instagram_post('{WORKER}');")
        for uid, expected in [(USER,'1'),(OTHER,'0')]:
            result = sql(f"BEGIN; SET ROLE authenticated; SET LOCAL request.jwt.claim.sub='{uid}'; SELECT count(*) FROM public.instagram_post_destinations; ROLLBACK;")
            self.assertEqual(result.stdout.strip(),expected)
        denied = sql(f"INSERT INTO public.scheduled_posts(id,user_id,status,details) VALUES ('{OTHER}','{OTHER}','scheduled','{{\"accountIds\":[\"{ACCOUNT}\"]}}');",False)
        self.assertNotEqual(denied.returncode,0); self.assertIn('target_owner',denied.stderr)
        self.assertEqual(sql("SELECT has_table_privilege('authenticated','instagram_tokens','SELECT'),has_function_privilege('authenticated','claim_instagram_post(uuid)','EXECUTE');").stdout.strip(),'f|f')

    def test_lease_recovery_keeps_container_and_completed_destinations(self):
        self.post(); sql(f"SELECT public.claim_instagram_post('{WORKER}');")
        sql(f"UPDATE public.instagram_post_destinations SET phase='sending',container_id='existing'; UPDATE public.scheduled_posts SET lease_until=now()-interval '1 second' WHERE id='{POST}'; SELECT public.claim_instagram_post('{OTHER}');")
        self.assertEqual(sql('SELECT phase,container_id FROM public.instagram_post_destinations;').stdout.strip(),'unknown|existing')
        sql("UPDATE public.instagram_post_destinations SET phase='published',media_id='completed';")
        sql(f"SELECT public.release_instagram_post('{POST}','{OTHER}');")
        self.assertEqual(sql(f"SELECT count(*) FROM public.claim_instagram_post('{WORKER}');").stdout.strip(),'0')
        self.assertEqual(sql('SELECT media_id FROM public.instagram_post_destinations;').stdout.strip(),'completed')

if __name__ == '__main__':
    bootstrap()
    unittest.main()