import { createFileRoute } from "@tanstack/react-router";
import { GRAPH } from "@/lib/meta/meta.functions";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function publishOne(token: string, igId: string, videoUrl: string, caption: string, format: string) {
  const params = new URLSearchParams({ video_url: videoUrl, caption, access_token: token, media_type: format === "stories" ? "STORIES" : "REELS" });
  if (format === "feed") params.set("share_to_feed", "true");
  const c = await (await fetch(`${GRAPH}/${igId}/media`, { method: "POST", body: params })).json();
  if (!c.id) throw new Error(c.error?.message ?? "Falha ao criar mídia");
  for (let i = 0; i < 20; i++) {
    await sleep(3000);
    const s = await (await fetch(`${GRAPH}/${c.id}?fields=status_code&access_token=${token}`)).json();
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR") throw new Error("A Meta não conseguiu processar o vídeo");
    if (i === 19) throw new Error("Tempo esgotado no processamento da Meta");
  }
  const p = await (await fetch(`${GRAPH}/${igId}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: c.id, access_token: token }) })).json();
  if (!p.id) throw new Error(p.error?.message ?? "Falha ao publicar");
  return p.id as string;
}

export const Route = createFileRoute("/api/public/cron-publish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: due } = await supabaseAdmin.from("scheduled_posts").select("*")
          .in("status", ["scheduled", "publishing"]).lte("scheduled_for", new Date().toISOString()).limit(3);
        const results: { id: string; ok: boolean; error?: string }[] = [];
        for (const post of due ?? []) {
          await supabaseAdmin.from("scheduled_posts").update({ status: "publishing" }).eq("id", post.id);
          try {
            const det = (post.details ?? {}) as { videoPath?: string; accounts?: string[] };
            if (!det.videoPath) throw new Error("O vídeo deste post não foi enviado para a nuvem");
            const { data: signed } = await supabaseAdmin.storage.from("videos").createSignedUrl(det.videoPath, 3600);
            if (!signed?.signedUrl) throw new Error("Não foi possível gerar o link do vídeo");
            const names = (det.accounts ?? []).map((a) => a.replace(/^@/, "").toLowerCase());
            const { data: accs } = await supabaseAdmin.from("instagram_accounts").select("id, ig_user_id, username").eq("user_id", post.user_id);
            const targets = (accs ?? []).filter((a) => names.includes((a.username ?? "").toLowerCase()));
            if (!targets.length) throw new Error("Nenhuma das contas escolhidas está conectada ao Instagram");
            let lastId = "";
            for (const t of targets) {
              const { data: tok } = await supabaseAdmin.from("instagram_tokens").select("access_token").eq("account_id", t.id).single();
              if (!tok) throw new Error(`Reconecte a conta @${t.username}`);
              lastId = await publishOne(tok.access_token, t.ig_user_id, signed.signedUrl, post.caption ?? "", post.format);
            }
            await supabaseAdmin.from("scheduled_posts").update({ status: "published", instagram_media_id: lastId, published_at: new Date().toISOString(), error_message: null }).eq("id", post.id);
            results.push({ id: post.id, ok: true });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "erro";
            await supabaseAdmin.from("scheduled_posts").update({ status: "failed", error_message: msg }).eq("id", post.id);
            results.push({ id: post.id, ok: false, error: msg });
          }
        }
        return Response.json({ processed: results.length, results });
      },
    },
  },
});
