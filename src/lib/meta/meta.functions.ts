import { createServerFn } from "@tanstack/react-start";
import { getRequest, setCookie } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { readConfig, allowedOrigin, authorizationUrl, bindingHash, CALLBACK_PATH } from "./config";

export const getMetaConfig = createServerFn({ method: "GET" }).handler(async () => ({ configured: !!readConfig(process.env) }));
export const startMetaConnect = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const cfg = readConfig(process.env);
    if (!cfg) throw new Error("Configuração Meta incompleta.");
    const request = getRequest();
    if (!allowedOrigin(data.origin, process.env.META_ALLOWED_ORIGINS) || request.headers.get("origin") !== data.origin) throw new Error("Origem não permitida.");
    const sessionId = z.string().uuid().parse(context.claims.session_id);
    const state = crypto.randomUUID();
    const binding = crypto.randomUUID() + crypto.randomUUID();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("meta_oauth_states").insert({ id: state, user_id: context.userId,
      session_id: sessionId, binding_hash: await bindingHash(binding), redirect_uri: data.origin + CALLBACK_PATH,
      expires_at: new Date(Date.now() + 600000).toISOString(), return_to: "/agenda" });
    if (error) throw new Error("Não foi possível iniciar conexão.");
    setCookie(`meta_binding_${state}`, binding, { httpOnly: true, secure: true, sameSite: "lax", path: CALLBACK_PATH, maxAge: 600 });
    return { url: authorizationUrl(cfg, data.origin, state) };
  });
