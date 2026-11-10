import { createServerFn } from "@tanstack/react-start";

export type ViralReel = {
  code: string;
  url: string;
  thumb: string;
  username: string;
  caption: string;
  plays: number;
  likes: number;
  comments: number;
};
export type ViralComment = { id: string; text: string; likes: number; username: string };

async function callApi(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET") {
  const key = process.env["RAPIDAPI_KEY"];
  const host = process.env["RAPIDAPI_HOST"];
  if (!key || !host) return { error: "Serviço de busca não configurado." };
  const qs = new URLSearchParams(params).toString();
  try {
    const headers: Record<string, string> = { "x-rapidapi-key": key, "x-rapidapi-host": host };
    const res = method === "POST"
      ? await fetch(`https://${host}/${path}`, { method, headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" }, body: qs })
      : await fetch(`https://${host}/${path}?${qs}`, { headers });
    const json = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      console.error("rapidapi", path, res.status);
      return { error: res.status === 429 ? "Limite de buscas do plano atingido." : "Serviço indisponível no momento." };
    }
    return { json };
  } catch (e) {
    console.error("rapidapi fetch", e);
    return { error: "Não foi possível conectar ao serviço." };
  }
}

function collectReels(node: unknown, out: Map<string, ViralReel>, depth = 0) {
  if (!node || typeof node !== "object" || depth > 12) return;
  if (Array.isArray(node)) { for (const n of node) collectReels(n, out, depth + 1); return; }
  const o = node as Record<string, any>;
  if (typeof o.code === "string" && ("like_count" in o || "play_count" in o) && !out.has(o.code)) {
    const thumb = o.image_versions2?.candidates?.[0]?.url ?? o.thumbnail_url ?? "";
    out.set(o.code, {
      code: o.code,
      url: `https://www.instagram.com/reel/${o.code}/`,
      thumb,
      username: o.user?.username ?? o.owner?.username ?? "",
      caption: (o.caption?.text ?? "").slice(0, 220),
      plays: Number(o.play_count ?? o.view_count ?? 0) || 0,
      likes: Number(o.like_count ?? 0) || 0,
      comments: Number(o.comment_count ?? 0) || 0,
    });
    return;
  }
  for (const v of Object.values(o)) collectReels(v, out, depth + 1);
}

export const searchVirals = createServerFn({ method: "POST" })
  .inputValidator((d: { mode: "profile" | "hashtag"; query: string }) => {
    const query = String(d.query ?? "").trim().replace(/^[@#]/, "").slice(0, 80);
    if (!query) throw new Error("Digite um termo de busca");
    return { mode: d.mode === "hashtag" ? "hashtag" : "profile", query } as const;
  })
  .handler(async ({ data }) => {
    const r = data.mode === "profile"
      ? await callApi("get_ig_user_reels.php", { username_or_url: data.query, amount: "24" }, "POST")
      : await callApi("search_hashtag.php", { hashtag: data.query });
    if ("error" in r) return { reels: [] as ViralReel[], error: r.error };
    const map = new Map<string, ViralReel>();
    collectReels(r.json, map);
    const reels = [...map.values()].sort((a, b) => b.plays - a.plays || b.likes - a.likes);
    return { reels, error: reels.length ? undefined : "Nenhum vídeo encontrado (perfil privado, inexistente ou sem dados no momento)." };
  });

export const getTopComments = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => {
    const code = String(d.code ?? "");
    if (!/^[\w-]{5,40}$/.test(code)) throw new Error("Código inválido");
    return { code };
  })
  .handler(async ({ data }) => {
    const r = await callApi("get_post_comments.php", { media_code: data.code, sort_order: "popular" });
    if ("error" in r) return { comments: [] as ViralComment[], error: r.error };
    const list = ((r.json as any)?.comments ?? []) as any[];
    const comments: ViralComment[] = list
      .filter((c) => typeof c?.text === "string" && c.text.trim())
      .map((c) => ({ id: String(c.pk ?? c.id), text: c.text, likes: Number(c.comment_like_count ?? 0), username: c.user?.username ?? "" }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 30);
    return { comments, error: comments.length ? undefined : "Sem comentários disponíveis." };
  });
