export type Platform = "instagram" | "tiktok" | "youtube" | "direct" | "unknown";

export function detectPlatform(url: string): Platform {
  const u = url.toLowerCase();
  if (/instagram\.com\/(reel|reels|p|tv)\//.test(u)) return "instagram";
  if (/tiktok\.com\//.test(u)) return "tiktok";
  if (/(youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/watch)/.test(u)) return "youtube";
  if (/^https?:\/\/.+\.(mp4|mov|webm)(\?.*)?$/.test(u)) return "direct";
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

/** Baixa um arquivo de vídeo direto (.mp4/.mov/.webm) que permita acesso. */
export async function fetchDirectVideo(url: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar (${res.status})`);
  const blob = await res.blob();
  const name = url.split("/").pop()?.split("?")[0] || "video.mp4";
  return new File([blob], name, { type: blob.type || "video/mp4" });
}
