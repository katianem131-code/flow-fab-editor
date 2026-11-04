import { createFileRoute } from "@tanstack/react-router";
import { detectPlatform } from "@/lib/editor/linkImport";

const COBALT = "https://cobalt-cobalt.g70ghi.easypanel.host/";

const ERRORS: Record<string, string> = {
  "error.api.youtube.login": "O YouTube pediu login ao serviço de download",
  "error.api.fetch.empty": "Vídeo não encontrado ou privado",
  "error.api.content.post.private": "Vídeo privado",
  "error.api.link.unsupported": "Link não suportado",
};

export const Route = createFileRoute("/api/public/social-video")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { url?: string };
        const url = String(body.url ?? "");
        const platform = detectPlatform(url);
        if (!["instagram", "tiktok", "youtube"].includes(platform)) {
          return Response.json({ error: "Link não suportado" }, { status: 400 });
        }
        const res = await fetch(COBALT, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ url, videoQuality: "1080" }),
        });
        const j = (await res.json().catch(() => null)) as
          | { status: string; url?: string; filename?: string; error?: { code: string }; picker?: { type: string; url: string }[] }
          | null;
        if (!j || j.status === "error") {
          const code = j?.error?.code ?? "";
          return Response.json({ error: ERRORS[code] ?? `Falha no serviço (${code || res.status})` }, { status: 502 });
        }
        let media = j.url;
        if (j.status === "picker") media = j.picker?.find((p) => p.type === "video")?.url;
        if (!media) return Response.json({ error: "Nenhum vídeo neste link" }, { status: 404 });
        const file = await fetch(media);
        if (!file.ok || !file.body) {
          return Response.json({ error: `Falha ao baixar (${file.status})` }, { status: 502 });
        }
        const name = (j.filename || `${platform}.mp4`).replace(/[^\w.\-]/g, "_");
        return new Response(file.body, {
          headers: {
            "Content-Type": file.headers.get("content-type") || "video/mp4",
            "X-Filename": name,
          },
        });
      },
    },
  },
});
