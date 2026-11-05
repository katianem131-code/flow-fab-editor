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
        try {
          return await handle(request);
        } catch (e) {
          return fail(`Serviço de download indisponível (${e instanceof Error ? e.message : "erro"})`);
        }
      },
    },
  },
});

// Falhas voltam com status 200 + JSON { error } para não serem tratadas como queda do app.
function fail(error: string) {
  return Response.json({ error }, { headers: { "X-Import-Error": "1" } });
}

async function handle(request: Request): Promise<Response> {
        const body = (await request.json().catch(() => ({}))) as { url?: string };
        const url = String(body.url ?? "");
        const platform = detectPlatform(url);
        if (!["instagram", "tiktok", "youtube"].includes(platform)) {
          return fail("Link não suportado");
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
          return fail(ERRORS[code] ?? `Falha no serviço (${code || res.status})`);
        }
        let media = j.url;
        if (j.status === "picker") media = j.picker?.find((p) => p.type === "video")?.url;
        if (!media) return fail("Nenhum vídeo neste link");
        const file = await fetch(media);
        if (!file.ok || !file.body) {
          return fail(`Falha ao baixar (${file.status})`);
        }
        const name = (j.filename || `${platform}.mp4`).replace(/[^\w.\-]/g, "_");
        return new Response(file.body, {
          headers: {
            "Content-Type": file.headers.get("content-type") || "video/mp4",
            "X-Filename": name,
          },
        });
}
