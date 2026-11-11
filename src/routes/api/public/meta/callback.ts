import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { allowedOrigin, bindingCookie, bindingHash, CALLBACK_PATH, readConfig } from "@/lib/meta/config";

export const Route = createFileRoute("/api/public/meta/callback")({ server: { handlers: {
  GET: async ({ request }) => {
    const url = new URL(request.url);
    if (!allowedOrigin(url.origin, process.env.META_ALLOWED_ORIGINS)) return new Response("Forbidden", { status: 403 });
    const state = z.string().uuid().safeParse(url.searchParams.get("state"));
    if (!state.success) return new Response("Invalid state", { status: 400 });
    const binding = bindingCookie(request.headers, state.data);
    const back = (msg: string) => new Response(null, { status: 302, headers: {
      Location: `${url.origin}/agenda?meta=${encodeURIComponent(msg)}`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
      "Set-Cookie": `meta_binding_${state.data}=; Path=${CALLBACK_PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    } });
    if (!binding) return back("expirado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: states, error } = await supabaseAdmin.rpc("consume_meta_state", { _id: state.data,
      _binding: await bindingHash(binding), _redirect: url.origin + CALLBACK_PATH });
    const st = states?.[0];
    if (error || !st) return back("expirado");
    const code = z.string().min(1).max(4096).safeParse(url.searchParams.get("code"));
    if (!code.success || url.searchParams.has("error")) return back("cancelado");
    const cfg = readConfig(process.env);
    if (!cfg) return back("nao-configurado");
    try {
      const { graphRequest, inspectToken, discoverAccounts } = await import("@/lib/meta/graph.server");
      const base = `https://graph.facebook.com/${cfg.version}`;
      const response = await graphRequest(base, "oauth/access_token", `${cfg.appId}|${cfg.appSecret}`, {
        client_id: cfg.appId, client_secret: cfg.appSecret, code: code.data, redirect_uri: st.redirect_uri ?? "",
      });
      let token = z.string().min(1).parse(response.access_token);
      const rawDebug = await graphRequest(base, "debug_token", `${cfg.appId}|${cfg.appSecret}`, { input_token: token });
      const actualKind = rawDebug.data?.type;
      if ((cfg.tokenKind === "system_user" && actualKind !== "SYSTEM_USER") || (cfg.tokenKind === "user" && actualKind !== "USER")) throw new Error("token_configuration_mismatch");
      // Only a Facebook User token uses fb_exchange_token; SUAT is already the delegated system token.
      if (cfg.tokenKind === "user") {
        const long = await graphRequest(base, "oauth/access_token", `${cfg.appId}|${cfg.appSecret}`, {
          grant_type: "fb_exchange_token", client_id: cfg.appId, client_secret: cfg.appSecret, fb_exchange_token: token,
        });
        token = z.string().min(1).parse(long.access_token);
      }
      const debug = await inspectToken(base, token, cfg.appId, cfg.appSecret);
      const pages = await discoverAccounts(base, token, cfg.tokenKind, debug);
      let count = 0;
      for (const pg of pages) {
        const ig = pg.instagram_business_account;
        if (!ig) continue;
        const publicationToken = cfg.tokenKind === "system_user" ? token : z.string().min(1).parse(pg.access_token);
        const publicationDebug = cfg.tokenKind === "system_user" ? debug : await inspectToken(base, publicationToken, cfg.appId, cfg.appSecret);
        const expires = publicationDebug.expires_at ? new Date(publicationDebug.expires_at * 1000).toISOString() : null;
        const { data: acc, error: ae } = await supabaseAdmin.from("instagram_accounts").upsert({ user_id: st.user_id,
          ig_user_id: ig.id, username: ig.username, page_id: pg.id, page_name: pg.name,
          profile_picture_url: ig.profile_picture_url ?? null, token_expires_at: expires }, { onConflict: "user_id,ig_user_id" }).select("id").single();
        if (ae || !acc) throw new Error("account_storage");
        const { error: te } = await supabaseAdmin.from("instagram_tokens").upsert({ account_id: acc.id, access_token: publicationToken,
          token_kind: cfg.tokenKind === "system_user" ? "system_user" : "page", expires_at: expires, data_access_expires_at: publicationDebug.data_access_expires_at ? new Date(publicationDebug.data_access_expires_at * 1000).toISOString() : null,
          revoked_at: null, updated_at: new Date().toISOString() });
        if (te) throw new Error("token_storage");
        count++;
      }
      return back(count ? `conectado-${count}` : "sem-conta-profissional");
    } catch { return back("erro"); } // Never log raw OAuth responses, codes or tokens.
  },
} } });
