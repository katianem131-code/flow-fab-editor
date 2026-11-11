import { createFileRoute } from "@tanstack/react-router";
import { GRAPH } from "@/lib/meta/meta.functions";

const back = (origin: string, msg: string) => Response.redirect(`${origin}/agenda?meta=${encodeURIComponent(msg)}`, 302);

export const Route = createFileRoute("/api/public/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) return back(origin, "cancelado");
        const appId = process.env["META_APP_ID"], secret = process.env["META_APP_SECRET"];
        if (!appId || !secret) return back(origin, "nao-configurado");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: st } = await supabaseAdmin.from("meta_oauth_states").select("*").eq("id", state).maybeSingle();
        if (!st || Date.now() - new Date(st.created_at).getTime() > 15 * 60e3) return back(origin, "expirado");
        await supabaseAdmin.from("meta_oauth_states").delete().eq("id", state);

        try {
          const redirect = `${origin}/api/public/meta/callback`;
          const short = await (await fetch(`${GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${secret}&redirect_uri=${encodeURIComponent(redirect)}&code=${code}`)).json();
          if (!short.access_token) throw new Error(short.error?.message ?? "token");
          const long = await (await fetch(`${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${secret}&fb_exchange_token=${short.access_token}`)).json();
          const userToken = long.access_token ?? short.access_token;
          const expiresAt = new Date(Date.now() + (long.expires_in ?? 60 * 86400) * 1000).toISOString();
          const pages = await (await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${userToken}`)).json();
          let count = 0;
          for (const pg of pages.data ?? []) {
            const ig = pg.instagram_business_account;
            if (!ig) continue;
            const { data: acc } = await supabaseAdmin.from("instagram_accounts").upsert({
              user_id: st.user_id, ig_user_id: ig.id, username: ig.username, page_id: pg.id, page_name: pg.name,
              profile_picture_url: ig.profile_picture_url ?? null, token_expires_at: expiresAt,
            }, { onConflict: "user_id,ig_user_id" }).select("id").single();
            if (acc) {
              await supabaseAdmin.from("instagram_tokens").upsert({ account_id: acc.id, access_token: pg.access_token, updated_at: new Date().toISOString() });
              count++;
            }
          }
          return back(origin, count ? `conectado-${count}` : "sem-conta-profissional");
        } catch (e) {
          console.error("meta callback", e);
          return back(origin, "erro");
        }
      },
    },
  },
});
