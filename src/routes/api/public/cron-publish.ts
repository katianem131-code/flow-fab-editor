import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { readConfig } from "@/lib/meta/config";
import { ownsPath, stepDestination, backoff, type Destination, type Patch, type Phase } from "@/lib/meta/publishing";

export const Route = createFileRoute("/api/public/cron-publish")({ server: { handlers: {
  POST: async ({ request }) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
    const cfg = readConfig(process.env);
    if (!cfg) return Response.json({ error: "meta_configuration_incomplete" }, { status: 503 });
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { graphRequest, inspectToken, GraphError } = await import("@/lib/meta/graph.server");
    const worker = crypto.randomUUID();
    const { data: posts, error: claimError } = await db.rpc("claim_instagram_post", { _worker: worker });
    if (claimError) return Response.json({ error: "claim_failed" }, { status: 503 });
    const post = posts?.[0];
    if (!post) return Response.json({ processed: 0 });
    try {
      const { data: destinations, error } = await db.from("instagram_post_destinations").select("*")
        .eq("post_id", post.id).eq("user_id", post.user_id).not("phase", "in", '("published","failed")')
        .or("phase.neq.unknown,and(container_id.not.is.null,attempts.lt.8)")
        .lte("next_attempt_at", new Date().toISOString()).order("next_attempt_at").limit(1);
      if (error) throw new Error("destinations_read");
      const row = destinations?.[0];
      if (row) {
        const d = row as Destination;
        const save = async (expected: Phase, patch: Patch) => {
          const { data: ok, error: e } = await db.rpc("advance_instagram_destination", { _post: post.id, _worker: worker,
            _destination: d.id, _expected: expected, _patch: { ...patch } });
          if (e) throw new Error("delivery_storage");
          return ok;
        };
        try {
          const { data: account, error: ae } = await db.from("instagram_accounts").select("id,ig_user_id,user_id")
            .eq("id", d.account_id).eq("user_id", post.user_id).single();
          if (ae || !account || d.user_id !== post.user_id) throw new GraphError("account_owner", false, false);
          const { data: token, error: te } = await db.from("instagram_tokens").select("*").eq("account_id", account.id).single();
          if (te || !token || token.revoked_at || [token.expires_at, token.data_access_expires_at].some((v) => v && Date.parse(v) <= Date.now()))
            throw new GraphError("reconnect", false, false);
          const base = `https://graph.facebook.com/${cfg.version}`;
          try { await inspectToken(base, token.access_token, cfg.appId, cfg.appSecret); }
          catch (e) {
            if (e instanceof GraphError && e.code === "reconnect") await db.from("instagram_tokens").update({ revoked_at: new Date().toISOString() }).eq("account_id", account.id);
            throw e;
          }
          const parsed = z.object({ videoPath: z.string().max(1024), coverSecond: z.number().min(0).max(180).optional() }).safeParse(post.details);
          await stepDestination(d, { save,
            create: async () => {
              if (!parsed.success || !ownsPath(post.user_id, parsed.data.videoPath)) throw new GraphError("media_owner", false, false);
              if (post.video_id) {
                const { data: media } = await db.from("videos").select("id").eq("id", post.video_id).eq("user_id", post.user_id).single();
                if (!media) throw new GraphError("media_owner", false, false);
              }
              const { data: bucket, error: be } = await db.storage.getBucket("videos");
              if (be || !bucket || bucket.public) throw new GraphError("private_storage_required", false, false);
              const { data: signed, error: se } = await db.storage.from("videos").createSignedUrl(parsed.data.videoPath, 86400);
              if (se || !signed) throw new GraphError("video_unavailable", false, false);
              // Browser/Meta must receive a reachable external Storage URL, never the sandbox server origin.
              const publicStorage = process.env.VITE_SUPABASE_URL;
              const signedUrl = new URL(signed.signedUrl);
              if (publicStorage) signedUrl.host = new URL(publicStorage).host;
              if (signedUrl.protocol !== "https:") throw new GraphError("storage_url_configuration", false, false);
              const result = await graphRequest(base, `${account.ig_user_id}/media`, token.access_token, {
                video_url: signedUrl.toString(), media_type: post.format === "stories" ? "STORIES" : "REELS",
                ...(post.format !== "stories" ? { caption: post.caption ?? "", share_to_feed: String(post.format === "feed"),
                  thumb_offset: String((parsed.data.coverSecond ?? 1) * 1000) } : {}),
              }, true);
              return typeof result.id === "string" ? result.id : "";
            },
            status: async (container) => {
              const result = await graphRequest(base, container, token.access_token, { fields: "status_code" });
              return z.string().parse(result.status_code);
            },
            publish: async (container) => {
              const result = await graphRequest(base, `${account.ig_user_id}/media_publish`, token.access_token, { creation_id: container }, true);
              return typeof result.id === "string" ? result.id : "";
            },
          });
        } catch (e) {
          const g = e instanceof GraphError ? e : new GraphError("preflight_failed", true, false);
          await save(d.phase, { phase: d.phase === "unknown" ? "unknown" : g.recoverable && d.attempts < 8 ? d.phase : "failed", error_code: g.code,
            next_attempt_at: new Date(Date.now() + backoff(d.attempts, g.retryAfter) * 1000).toISOString() });
        }
      }
      const { error: releaseError } = await db.rpc("release_instagram_post", { _post: post.id, _worker: worker });
      if (releaseError) throw new Error("release_failed");
      return Response.json({ processed: row ? 1 : 0 }); // No tokens, signed URLs or user data in cron responses.
    } catch { return Response.json({ error: "delivery_persistence_failed" }, { status: 503 }); }
  },
} } });
