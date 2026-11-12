import { createServerFn } from "@tanstack/react-start";
import { getRequest, setCookie } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { readConfig, verifyRequestOrigin, authorizationUrl, bindingHash, CALLBACK_PATH } from "./config";

export const getMetaConfig = createServerFn({ method: "GET" }).handler(async () => ({ configured: !!readConfig(process.env) }));
export const startMetaConnect = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const cfg = readConfig(process.env);
    if (!cfg) throw new Error("configuracao_incompleta");
    const request = getRequest();
    if (!verifyRequestOrigin(request.headers, data.origin, process.env.META_ALLOWED_ORIGINS)) throw new Error("origem_invalida");
    const parsedSession = z.string().uuid().safeParse(context.claims.session_id);
    if (!parsedSession.success) throw new Error("falha_sessao");
    const sessionId = parsedSession.data;
    const state = crypto.randomUUID();
    const binding = crypto.randomUUID() + crypto.randomUUID();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("meta_oauth_states").insert({ id: state, user_id: context.userId,
      session_id: sessionId, binding_hash: await bindingHash(binding), redirect_uri: data.origin + CALLBACK_PATH,
      expires_at: new Date(Date.now() + 600000).toISOString(), return_to: "/agenda" });
    if (error) throw new Error("falha_estado");
    setCookie(`meta_binding_${state}`, binding, { httpOnly: true, secure: true, sameSite: "lax", path: CALLBACK_PATH, maxAge: 600 });
    return { url: authorizationUrl(cfg, data.origin, state) };
  });
