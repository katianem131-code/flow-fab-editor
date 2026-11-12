import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { allowedOrigin, bindingCookie, bindingHash, CALLBACK_PATH, readConfig } from "@/lib/meta/config";
import { createDiag, mapTokenType, reasonFromError, summarizeScopes } from "@/lib/meta/diagnostics";

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
    // Sanitized diagnostics: fresh random correlation ID; enums and counts only.
    const diag = createDiag();
    if (!binding) { diag.emit("expired_state"); return back("expirado"); }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: states, error } = await supabaseAdmin.rpc("consume_meta_state", { _id: state.data,
      _binding: await bindingHash(binding), _redirect: url.origin + CALLBACK_PATH });
    const st = states?.[0];
    if (error || !st) { diag.emit("expired_state"); return back("expirado"); }
    diag.stage("code");
    const code = z.string().min(1).max(4096).safeParse(url.searchParams.get("code"));
    if (!code.success || url.searchParams.has("error")) { diag.emit("cancelled"); return back("cancelado"); }
    diag.stage("config");
    const cfg = readConfig(process.env);
    if (!cfg) { diag.emit("not_configured"); return back("nao-configurado"); }
    try {
      const { graphRequest, inspectToken, discoverAccounts } = await import("@/lib/meta/graph.server");
      const base = `https://graph.facebook.com/${cfg.version}`;
      diag.stage("token_exchange");
      const response = await graphRequest(base, "oauth/access_token", `${cfg.appId}|${cfg.appSecret}`, {
        client_id: cfg.appId, client_secret: cfg.appSecret, code: code.data, redirect_uri: st.redirect_uri ?? "",
      });
      let token = z.string().min(1).parse(response.access_token);
      diag.stage("token_type");
      const rawDebug = await graphRequest(base, "debug_token", `${cfg.appId}|${cfg.appSecret}`, { input_token: token });
      // Use the token type Meta actually returned: Business Login can issue USER or SYSTEM_USER tokens.
      const actualKind = rawDebug.data?.type;
      // Pre-inspection summary so a failed permission check still shows scope counts; replaced after inspect.
      diag.set({ token_type: mapTokenType(actualKind), ...summarizeScopes(rawDebug.data?.granular_scopes) });
      const kind: "user" | "system_user" = actualKind === "SYSTEM_USER" ? "system_user" : actualKind === "USER" ? "user" : cfg.tokenKind;
      // Only a Facebook User token uses fb_exchange_token; SUAT is already the delegated system token.
      if (kind === "user") {
        diag.stage("long_lived_exchange");
        const long = await graphRequest(base, "oauth/access_token", `${cfg.appId}|${cfg.appSecret}`, {
          grant_type: "fb_exchange_token", client_id: cfg.appId, client_secret: cfg.appSecret, fb_exchange_token: token,
        });
        token = z.string().min(1).parse(long.access_token);
      }
      diag.stage("inspect");
      const debug = await inspectToken(base, token, cfg.appId, cfg.appSecret);
      diag.set(summarizeScopes(debug.granular_scopes));
      diag.stage("discover");
      const pages = await discoverAccounts(base, token, kind, debug, diag);
      diag.stage("store");
      const { accountLimit } = await import("@/lib/billing/plans");
      const { data: bill } = await supabaseAdmin.from("user_billing").select("plan_name, plan_status").eq("user_id", st.user_id).maybeSingle();
      const limit = accountLimit(bill?.plan_name, bill?.plan_status);
      const { data: existing } = await supabaseAdmin.from("instagram_accounts").select("ig_user_id").eq("user_id", st.user_id);
      const known = new Set((existing ?? []).map((a) => a.ig_user_id));
      let total = known.size;
      let count = 0, skipped = 0;
      for (const pg of pages) {
        const ig = pg.instagram_business_account;
        if (!ig) continue;
        if (!known.has(ig.id)) { if (total >= limit) { skipped++; continue; } total++; }
        // Direct Instagram assets have no Page token; the long-lived user token publishes for them.
        const publicationToken = kind === "system_user" ? token : (pg.access_token ?? token);
        const publicationDebug = publicationToken === token ? debug : await inspectToken(base, publicationToken, cfg.appId, cfg.appSecret);
        const expires = publicationDebug.expires_at ? new Date(publicationDebug.expires_at * 1000).toISOString() : null;
        const { data: acc, error: ae } = await supabaseAdmin.from("instagram_accounts").upsert({ user_id: st.user_id,
          ig_user_id: ig.id, username: ig.username, page_id: pg.id, page_name: pg.name,
          profile_picture_url: ig.profile_picture_url ?? null, token_expires_at: expires }, { onConflict: "user_id,ig_user_id" }).select("id").single();
        if (ae || !acc) throw new Error("account_storage");
        const { error: te } = await supabaseAdmin.from("instagram_tokens").upsert({ account_id: acc.id, access_token: publicationToken,
          token_kind: kind === "system_user" ? "system_user" : pg.access_token ? "page" : "user", expires_at: expires, data_access_expires_at: publicationDebug.data_access_expires_at ? new Date(publicationDebug.data_access_expires_at * 1000).toISOString() : null,
          revoked_at: null, updated_at: new Date().toISOString() });
        if (te) throw new Error("token_storage");
        count++;
      }
      diag.set({ accounts_stored: count, accounts_skipped_limit: skipped });
      diag.stage("done");
      if (!count && skipped) { diag.emit("limit"); return back("limite"); }
      diag.emit(count ? "ok" : "asset_configuration_incomplete");
      return back(count ? `conectado-${count}` : "sem-conta-profissional");
    } catch (e) {
      // Log only our sanitized error code; never raw OAuth responses, codes or tokens.
      const c = e instanceof Error && /^[a-z_0-9]+$/.test(e.message) ? e.message : "unexpected";
      console.error("meta_callback_failed", c);
      diag.emit(reasonFromError(c));
      if (c === "asset_configuration_incomplete") return back("sem-conta-profissional");
      if (c === "reconnect") return back("permissoes");
      if (c === "too_many_assets") return back("muitas-contas");
      return back("erro");
    }
  },
} } });
