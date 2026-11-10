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

async function callApi(key: string, host: string, path: string, params: Record<string, string>, method: "GET" | "POST" = "GET") {
  if (!key || !host) return { error: "Serviço de busca não configurado." };
  const qs = new URLSearchParams(params).toString();
  try {
    const headers: Record<string, string> = { "x-rapidapi-key": key, "x-rapidapi-host": host };
    const res = method === "POST"
      ? await fetch(`https://${host}/${path}`, { method, headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" }, body: qs })
      : await fetch(`https://${host}/${path}?${qs}`, { headers });
    const json = (await res.json().catch(() => null)) as any;
    const providerMessage = String(json?.message ?? json?.error ?? "");
    if (/quota|limit|exceeded/i.test(providerMessage)) {
      return { error: "A cota de buscas do seu plano no RapidAPI foi atingida. Ela renova no próximo ciclo ou pode ser ampliada no plano." };
    }
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

export type ViralMode = "subject" | "profile" | "hashtag";

export const searchVirals = createServerFn({ method: "POST" })
  .inputValidator((d: { mode: ViralMode; query: string }) => {
    const query = String(d.query ?? "").trim().replace(/^[@#]/, "").slice(0, 80);
    if (!query) throw new Error("Digite um termo de busca");
    const mode: ViralMode = d.mode === "hashtag" || d.mode === "subject" ? d.mode : "profile";
    return { mode, query };
  })
  .handler(async ({ data }) => {
    const key = process.env["RAPIDAPI_KEY"] ?? "";
    const host = process.env["RAPIDAPI_HOST"] ?? "";
    if (!key || !host) return { reels: [] as ViralReel[], error: "Serviço de busca não configurado." };
    const map = new Map<string, ViralReel>();
    // The provider intermittently answers "data not found"; retry a couple of times.
    for (let attempt = 0; attempt < 3 && map.size === 0; attempt++) {
      const r = data.mode === "profile"
        ? await callApi(key, host, "get_ig_user_reels.php", { username_or_url: data.query, amount: "24" }, "POST")
        : data.mode === "hashtag"
          ? await callApi(key, host, "search_hashtag.php", { hashtag: data.query })
          : await callApi(key, host, "search_ig.php", { search_query: data.query }, "POST");
      if ("error" in r) return { reels: [] as ViralReel[], error: r.error };
      collectReels(r.json, map);
    }
    const reels = [...map.values()].sort((a, b) => b.plays - a.plays || b.likes - a.likes);
    return { reels, error: reels.length ? undefined : "Nenhum vídeo encontrado (perfil privado, inexistente ou sem dados no momento)." };
  });

export type SimilarProfile = { username: string; fullName: string; avatar: string; followers: number };

export const findSimilarProfiles = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string }) => {
    const query = String(d.query ?? "").trim().replace(/^@/, "").slice(0, 80);
    if (!query) throw new Error("Digite um perfil");
    return { query };
  })
  .handler(async ({ data }) => {
    const key = process.env["RAPIDAPI_KEY"] ?? "";
    const host = process.env["RAPIDAPI_HOST"] ?? "";
    if (!key || !host) return { profiles: [] as SimilarProfile[], error: "Serviço de busca não configurado." };
    const found = new Map<string, SimilarProfile>();
    for (let attempt = 0; attempt < 3 && found.size === 0; attempt++) {
      const r = await callApi(key, host, "get_ig_similar_accounts.php", { username_or_url: data.query }, "POST");
      if ("error" in r) return { profiles: [] as SimilarProfile[], error: r.error };
      collectProfiles(r.json, found);
      found.delete(data.query.toLowerCase());
    }
    const profiles = [...found.values()].sort((a, b) => b.followers - a.followers).slice(0, 30);
    return { profiles, error: profiles.length ? undefined : "Nenhum perfil parecido encontrado." };
  });

function collectProfiles(node: unknown, out: Map<string, SimilarProfile>, depth = 0) {
  if (!node || typeof node !== "object" || depth > 10) return;
  if (Array.isArray(node)) { for (const n of node) collectProfiles(n, out, depth + 1); return; }
  const o = node as Record<string, any>;
  if (typeof o.username === "string" && o.username && "profile_pic_url" in o) {
    const key = o.username.toLowerCase();
    if (!out.has(key)) {
      out.set(key, {
        username: o.username,
        fullName: o.full_name ?? "",
        avatar: o.profile_pic_url ?? "",
        followers: Number(o.follower_count ?? o.followers ?? 0) || 0,
      });
    }
    return;
  }
  for (const v of Object.values(o)) collectProfiles(v, out, depth + 1);
}

export const getTopComments = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => {
    const code = String(d.code ?? "");
    if (!/^[\w-]{5,40}$/.test(code)) throw new Error("Código inválido");
    return { code };
  })
  .handler(async ({ data }) => {
    const key = process.env["RAPIDAPI_KEY"] ?? "";
    const host = process.env["RAPIDAPI_HOST"] ?? "";
    if (!key || !host) return { comments: [] as ViralComment[], error: "Serviço de busca não configurado." };
    const r = await callApi(key, host, "get_post_comments.php", { media_code: data.code, sort_order: "popular" });
    if ("error" in r) return { comments: [] as ViralComment[], error: r.error };
    const list = ((r.json as any)?.comments ?? []) as any[];
    const comments: ViralComment[] = list
      .filter((c) => typeof c?.text === "string" && c.text.trim())
      .map((c) => ({ id: String(c.pk ?? c.id), text: c.text, likes: Number(c.comment_like_count ?? 0), username: c.user?.username ?? "" }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 30);
    return { comments, error: comments.length ? undefined : "Sem comentários disponíveis." };
  });
