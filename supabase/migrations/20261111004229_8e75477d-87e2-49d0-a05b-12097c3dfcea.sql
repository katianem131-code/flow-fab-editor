CREATE TABLE public.user_billing (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name text,
  plan_status text NOT NULL DEFAULT 'inativo',
  plan_renews_at timestamptz,
  credits_balance integer NOT NULL DEFAULT 0,
  customer_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_billing TO authenticated;
GRANT ALL ON public.user_billing TO service_role;
ALTER TABLE public.user_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own billing" ON public.user_billing FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_billing_updated BEFORE UPDATE ON public.user_billing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  kind text NOT NULL,
  description text,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX credit_tx_external_uniq ON public.credit_transactions(external_id, kind) WHERE external_id IS NOT NULL;
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own credit tx" ON public.credit_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- consume credits atomically as the signed-in user
CREATE OR REPLACE FUNCTION public.consume_credits(_amount integer, _description text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_balance integer;
BEGIN
  IF auth.uid() IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid'; END IF;
  UPDATE public.user_billing SET credits_balance = credits_balance - _amount
    WHERE user_id = auth.uid() AND credits_balance >= _amount
    RETURNING credits_balance INTO new_balance;
  IF new_balance IS NULL THEN RAISE EXCEPTION 'Créditos insuficientes'; END IF;
  INSERT INTO public.credit_transactions(user_id, amount, kind, description) VALUES (auth.uid(), -_amount, 'uso', _description);
  RETURN new_balance;
END $$;
REVOKE ALL ON FUNCTION public.consume_credits(integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consume_credits(integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_billing(user_id, credits_balance, customer_email) VALUES (NEW.id, 10, NEW.email) ON CONFLICT DO NOTHING;
  INSERT INTO public.credit_transactions(user_id, amount, kind, description) VALUES (NEW.id, 10, 'bonus', 'Créditos de boas-vindas');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_billing AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_billing();
INSERT INTO public.user_billing(user_id, credits_balance, customer_email)
  SELECT id, 10, email FROM auth.users ON CONFLICT DO NOTHING;

CREATE TABLE public.instagram_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ig_user_id text NOT NULL,
  username text,
  page_id text,
  page_name text,
  profile_picture_url text,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ig_user_id)
);
GRANT SELECT, DELETE ON public.instagram_accounts TO authenticated;
GRANT ALL ON public.instagram_accounts TO service_role;
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own ig" ON public.instagram_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own ig" ON public.instagram_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_ig_updated BEFORE UPDATE ON public.instagram_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.instagram_tokens (
  account_id uuid PRIMARY KEY REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.instagram_tokens TO service_role;
ALTER TABLE public.instagram_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.meta_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  return_to text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.meta_oauth_states TO authenticated;
GRANT ALL ON public.meta_oauth_states TO service_role;
ALTER TABLE public.meta_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert own state" ON public.meta_oauth_states FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.scheduled_posts ADD COLUMN instagram_account_id uuid REFERENCES public.instagram_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.scheduled_posts ADD COLUMN creation_id text;
CREATE INDEX IF NOT EXISTS scheduled_posts_due_idx ON public.scheduled_posts(status, scheduled_for);