import { createFileRoute } from "@tanstack/react-router";
import { strToU8, zipSync } from "fflate";
import { z } from "zod";
import { detectPlatform } from "@/lib/editor/linkImport";

const COBALT = "https://cobalt-cobalt.g70ghi.easypanel.host/";
const MANIFEST = "_labremix-post.json";
const MAX_SLIDES = 20;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_BYTES = 300 * 1024 * 1024;

const ERRORS: Record<string, string> = {
  "error.api.youtube.login": "O YouTube pediu login ao serviço de download",
  "error.api.fetch.empty": "Conteúdo não encontrado ou privado",
  "error.api.content.post.private": "Conteúdo privado",
  "error.api.link.unsupported": "Link não suportado",
};

const bodySchema = z.object({ url: z.string().url().max(2048) });
const responseSchema = z.object({
  status: z.string(),
  url: z.string().url().optional(),
  filename: z.string().max(500).optional(),
  caption: z.string().max(10000).optional(),
  text: z.string().max(10000).optional(),
  title: z.string().max(10000).optional(),
  error: z.object({ code: z.string() }).optional(),
  picker: z.array(z.object({ type: z.string(), url: z.string().url() })).max(100).optional(),
});

type CobaltResponse = z.infer<typeof responseSchema>;
type DownloadedMedia = { name: string; kind: "video" | "image"; bytes: Uint8Array };

export const Route = createFileRoute("/api/public/social-video")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await handle(request);
        } catch (error) {
          return fail(`Serviço de download indisponível (${error instanceof Error ? error.message : "erro"})`);
        }
      },
    },
  },
});

// Failures remain JSON instead of looking like an application outage.
function fail(error: string) {
  return Response.json({ error }, { headers: { "X-Import-Error": "1" } });
}

async function isSignedIn(request: Request): Promise<boolean> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return !error && !!data.user;
}

async function handle(request: Request): Promise<Response> {
  // Downloads use server bandwidth and a shared provider: signed-in users only.
  if (!(await isSignedIn(request))) return Response.json({ error: "Entre na sua conta para importar links." }, { status: 401, headers: { "X-Import-Error": "1" } });
  const parsedBody = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsedBody.success) return fail("Link inválido");
  const { url } = parsedBody.data;
  const platform = detectPlatform(url);
  if (!["instagram", "tiktok", "youtube"].includes(platform)) return fail("Link não suportado");

  const res = await fetch(COBALT, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ url, videoQuality: "1080" }),
    signal: AbortSignal.timeout(45_000),
  });
  const raw = await res.json().catch(() => null);
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success || parsed.data.status === "error") {
    const code = parsed.success ? parsed.data.error?.code ?? "" : "";
    return fail(ERRORS[code] ?? `Falha no serviço (${code || res.status})`);
  }
  const post = parsed.data;
  const picker = post.status === "picker"
    ? (post.picker ?? []).filter((item) => item.type === "video" || item.type === "photo" || item.type === "gif")
    : [];
  const descriptors = picker.length
    ? picker.map((item) => ({ url: item.url, kind: item.type === "video" ? "video" as const : "image" as const }))
    : post.url
      ? [{ url: post.url, kind: mediaKindFromFilename(post.filename) }]
      : [];
  if (!descriptors.length) return fail("Nenhum vídeo ou imagem neste link");
  if (descriptors.length > MAX_SLIDES) return fail(`Este carrossel excede o limite de ${MAX_SLIDES} itens`);

  const baseName = safeName((post.filename || platform).replace(/\.[^.]+$/, "")) || platform;
  const files: DownloadedMedia[] = [];
  let totalBytes = 0;
  for (let index = 0; index < descriptors.length; index++) {
    const descriptor = descriptors[index];
    const mediaUrl = new URL(descriptor.url);
    if (mediaUrl.protocol !== "https:") return fail("O serviço retornou um endereço de mídia inseguro");
    const file = await fetch(mediaUrl, { signal: AbortSignal.timeout(60_000) });
    if (!file.ok) return fail(`Falha ao baixar o item ${index + 1} (${file.status})`);
    const length = Number(file.headers.get("content-length") ?? 0);
    if (length > MAX_FILE_BYTES) return fail(`O item ${index + 1} excede 100 MB`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    totalBytes += bytes.byteLength;
    if (bytes.byteLength > MAX_FILE_BYTES || totalBytes > MAX_TOTAL_BYTES) {
      return fail("O conteúdo excede o limite total de 300 MB por postagem");
    }
    const contentType = file.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
    const kind = descriptor.kind === "image" || contentType.startsWith("image/") ? "image" : "video";
    const extension = extensionFor(kind, contentType, post.filename);
    files.push({
      name: `${baseName}_${String(index + 1).padStart(2, "0")}.${extension}`,
      kind,
      bytes,
    });
  }

  // Cobalt does not expose Instagram captions; preserve them only when a provider supplies one.
  const caption = firstCaption(post);
  const manifest = strToU8(JSON.stringify({
    caption,
    files: files.map((file, index) => ({ name: file.name, kind: file.kind, slideIndex: index + 1 })),
  }));
  const archive: Record<string, Uint8Array> = { [MANIFEST]: manifest };
  for (const file of files) archive[file.name] = file.bytes;
  const zipped = zipSync(archive, { level: 0 });
  const output = new Uint8Array(zipped.byteLength);
  output.set(zipped);
  return new Response(output, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${platform}-post.zip"`,
      "X-Filename": `${platform}-post.zip`,
      "Cache-Control": "no-store",
    },
  });
}

function firstCaption(post: CobaltResponse): string {
  return [post.caption, post.text, post.title].find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

function mediaKindFromFilename(filename?: string): "video" | "image" {
  return filename && /\.(jpe?g|png|webp|gif)$/i.test(filename) ? "image" : "video";
}

function extensionFor(kind: "video" | "image", contentType: string, filename?: string): string {
  if (kind === "image") {
    if (contentType.includes("png")) return "png";
    if (contentType.includes("webp")) return "webp";
    if (contentType.includes("gif")) return "gif";
    return "jpg";
  }
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("quicktime") || (filename && /\.mov$/i.test(filename))) return "mov";
  return "mp4";
}

function safeName(name: string): string {
  return name.replace(/[^\p{L}\p{N}._-]+/gu, "_").replace(/^\.+/, "").slice(0, 160);
}
