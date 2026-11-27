import { strFromU8, unzipSync } from "fflate";
import { mediaKind, type MediaKind, type MediaSource } from "./media";

export type Platform = "instagram" | "tiktok" | "youtube" | "direct" | "unknown";

export interface ImportedMediaFile {
  file: File;
  kind: MediaKind;
  source: MediaSource;
}

export interface ImportedPost {
  sourceUrl: string;
  caption: string;
  files: ImportedMediaFile[];
}

interface ArchiveManifest {
  caption?: string;
  files?: { name: string; kind: MediaKind; slideIndex: number }[];
}

export function detectPlatform(url: string): Platform {
  const u = url.toLowerCase();
  if (/instagram\.com\/(reel|reels|p|tv)\//.test(u)) return "instagram";
  if (/tiktok\.com\//.test(u)) return "tiktok";
  if (/(youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/watch)/.test(u)) return "youtube";
  if (/^https?:\/\/.+\.(mp4|mov|webm|jpe?g|png|webp)(\?.*)?$/.test(u)) return "direct";
  return "unknown";
}

export function parseLinks(text: string): { url: string; platform: Platform }[] {
  const seen = new Set<string>();
  return text
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
    .map((url) => ({ url, platform: detectPlatform(url) }));
}

export function normalizeUsername(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  direct: "Arquivo",
  unknown: "Inválido",
};

const MANIFEST = "_labremix-post.json";

/** Reads the ZIP returned for a social post, preserving every carousel slide. */
export function readImportedArchive(buffer: ArrayBuffer, sourceUrl: string): ImportedPost {
  const entries = unzipSync(new Uint8Array(buffer));
  const manifestBytes = entries[MANIFEST];
  if (!manifestBytes) throw new Error("Pacote de importação inválido");
  const manifest = JSON.parse(strFromU8(manifestBytes)) as ArchiveManifest;
  const postId = crypto.randomUUID();
  const descriptors = new Map((manifest.files ?? []).map((item) => [item.name, item]));
  const mediaNames = Object.keys(entries).filter((name) => name !== MANIFEST && descriptors.has(name));
  const files = mediaNames.map((name) => {
    const bytes = entries[name];
    const descriptor = descriptors.get(name)!;
    // Copy into a standalone buffer so Blob accepts the exact file bytes.
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const file = new File([copy], name, {
      type: descriptor.kind === "image" ? mimeForFilename(name, "image/jpeg") : "video/mp4",
    });
    return {
      file,
      kind: descriptor.kind,
      source: {
        sourceUrl,
        postId,
        slideIndex: descriptor.slideIndex,
        slideCount: mediaNames.length,
        caption: manifest.caption?.trim() || undefined,
      },
    };
  });
  if (!files.length) throw new Error("Nenhuma mídia válida neste link");
  return { sourceUrl, caption: manifest.caption?.trim() ?? "", files };
}

function mimeForFilename(name: string, fallback: string): string {
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.webp$/i.test(name)) return "image/webp";
  if (/\.jpe?g$/i.test(name)) return "image/jpeg";
  return fallback;
}

/** Downloads all videos/photos returned for one public social post. */
export async function fetchSocialMedia(url: string): Promise<ImportedPost> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: auth } = await supabase.auth.getSession();
  const token = auth.session?.access_token;
  if (!token) throw new Error("Entre na sua conta para importar links.");
  const res = await fetch("/api/public/social-video", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url }),
  });
  if (!res.ok || res.headers.get("X-Import-Error")) {
    const j = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(j?.error ?? `Falha (${res.status})`);
  }
  if (res.headers.get("content-type")?.includes("application/zip")) {
    return readImportedArchive(await res.arrayBuffer(), url);
  }

  // Backward compatibility with a server that still returns one raw file.
  const blob = await res.blob();
  const name = res.headers.get("X-Filename") || "video.mp4";
  const file = new File([blob], name, { type: blob.type || "video/mp4" });
  const kind = mediaKind(file);
  if (!kind) throw new Error("Formato de mídia não suportado");
  return {
    sourceUrl: url,
    caption: "",
    files: [{ file, kind, source: { sourceUrl: url, postId: crypto.randomUUID(), slideIndex: 1, slideCount: 1 } }],
  };
}

/** Compatibility helper for screens that import only videos for editing. */
export async function fetchSocialVideo(url: string): Promise<File> {
  const post = await fetchSocialMedia(url);
  const video = post.files.find((item) => item.kind === "video");
  if (!video) throw new Error("Este link contém somente imagens. Importe-o pela tela de lotes.");
  return video.file;
}

/** Downloads a direct image/video URL that permits browser access. */
export async function fetchDirectMedia(url: string): Promise<ImportedPost> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar (${res.status})`);
  const blob = await res.blob();
  const name = url.split("/").pop()?.split("?")[0] || "video.mp4";
  const file = new File([blob], name, { type: blob.type || "video/mp4" });
  const kind = mediaKind(file);
  if (!kind) throw new Error("Formato de mídia não suportado");
  return {
    sourceUrl: url,
    caption: "",
    files: [{ file, kind, source: { sourceUrl: url, postId: crypto.randomUUID(), slideIndex: 1, slideCount: 1 } }],
  };
}

export async function fetchDirectVideo(url: string): Promise<File> {
  const post = await fetchDirectMedia(url);
  if (post.files[0].kind !== "video") throw new Error("Este arquivo não é um vídeo");
  return post.files[0].file;
}
