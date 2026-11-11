// Sincroniza lotes, vídeos e agendamentos com o Supabase quando há usuário logado.
// Todas as funções falham silenciosamente: o app continua funcionando localmente.
import { supabase } from "@/integrations/supabase/client";
import type { BatchRecord } from "@/lib/editor/batches";
import type { ScheduledPost, PostStatus } from "@/lib/editor/schedule";

export const VIDEO_BUCKET = "videos";

async function currentUserId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function warn(where: string, err: unknown) {
  if (err) console.warn(`[cloud] ${where}:`, err);
}

const safeName = (n: string) => n.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(-120);

export async function cloudSaveBatch(rec: BatchRecord) {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase.from("batches").upsert({
    id: rec.id,
    user_id: uid,
    name: rec.name,
    target: rec.destination === "ai" ? "analise" : "editor",
    item_count: rec.videoCount + rec.imageCount + rec.linkCount,
    created_at: rec.createdAt,
    details: {
      videoCount: rec.videoCount,
      imageCount: rec.imageCount,
      linkCount: rec.linkCount,
      fileNames: rec.fileNames,
      destination: rec.destination ?? null,
    },
  });
  warn("save batch", error);
}

export async function cloudRenameBatch(id: string, name: string) {
  if (!(await currentUserId())) return;
  const { error } = await supabase.from("batches").update({ name }).eq("id", id);
  warn("rename batch", error);
}

export async function cloudRemoveBatch(id: string) {
  const uid = await currentUserId();
  if (!uid) return;
  const { data: files } = await supabase.storage.from(VIDEO_BUCKET).list(`${uid}/${id}`);
  if (files?.length) {
    await supabase.storage.from(VIDEO_BUCKET).remove(files.map((f) => `${uid}/${id}/${f.name}`));
  }
  const { error } = await supabase.from("batches").delete().eq("id", id);
  warn("remove batch", error);
}

export async function cloudFetchBatches(): Promise<BatchRecord[] | null> {
  if (!(await currentUserId())) return null;
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return warn("fetch batches", error), null;
  return (data ?? []).map((b) => {
    const d = (b.details ?? {}) as Record<string, unknown>;
    return {
      id: b.id,
      name: b.name,
      createdAt: b.created_at,
      videoCount: Number(d.videoCount ?? b.item_count ?? 0),
      imageCount: Number(d.imageCount ?? 0),
      linkCount: Number(d.linkCount ?? 0),
      fileNames: Array.isArray(d.fileNames) ? (d.fileNames as string[]) : [],
      destination: b.target === "analise" ? "ai" : (d.destination as BatchRecord["destination"]) ?? undefined,
    };
  });
}

/** Envia os vídeos do lote para o Storage e registra cada um na tabela videos. */
export async function cloudUploadBatchFiles(batchId: string, files: File[]) {
  const uid = await currentUserId();
  if (!uid || !files.length) return;
  // garante que o lote exista (chave estrangeira)
  await supabase
    .from("batches")
    .upsert({ id: batchId, user_id: uid, name: "Lote" }, { onConflict: "id", ignoreDuplicates: true });
  const { data: existing } = await supabase.from("videos").select("storage_path").eq("batch_id", batchId);
  const known = new Set((existing ?? []).map((v) => v.storage_path));
  for (const f of files) {
    const path = `${uid}/${batchId}/${f.size}_${safeName(f.name)}`;
    if (known.has(path)) continue;
    const up = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(path, f, { upsert: true, contentType: f.type || "video/mp4" });
    if (up.error) {
      warn("upload", up.error);
      continue;
    }
    const { error } = await supabase.from("videos").insert({
      user_id: uid,
      batch_id: batchId,
      original_name: f.name,
      storage_path: path,
      size_bytes: f.size,
      status: "uploaded",
    });
    warn("insert video", error);
    known.add(path);
  }
}

export async function cloudLoadBatchFiles(batchId: string): Promise<File[]> {
  if (!(await currentUserId())) return [];
  const { data, error } = await supabase
    .from("videos")
    .select("original_name, storage_path")
    .eq("batch_id", batchId)
    .order("created_at");
  if (error || !data) return warn("list videos", error), [];
  const out: File[] = [];
  for (const v of data) {
    if (!v.storage_path) continue;
    const dl = await supabase.storage.from(VIDEO_BUCKET).download(v.storage_path);
    if (dl.data) {
      out.push(new File([dl.data], v.original_name ?? "video.mp4", { type: dl.data.type || "video/mp4" }));
    } else warn("download", dl.error);
  }
  return out;
}

const toDbStatus = (s: PostStatus) => (s === "error" ? "failed" : s);
const fromDbStatus = (s: string): PostStatus =>
  s === "failed" ? "error" : s === "draft" ? "scheduled" : (s as PostStatus);

export async function cloudUpsertPost(p: ScheduledPost) {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase.from("scheduled_posts").upsert({
    id: p.id,
    user_id: uid,
    platform: "instagram",
    account_username: p.accounts.join(", "),
    format: p.format,
    scheduled_for: p.publishAt,
    caption: p.caption,
    status: toDbStatus(p.status),
    created_at: p.createdAt,
    details: { videoName: p.videoName, headline: p.headline, accounts: p.accounts, coverSecond: p.coverSecond, videoPath: p.videoPath },
  });
  warn("save post", error);
}

export async function cloudDeletePost(id: string) {
  if (!(await currentUserId())) return;
  const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
  warn("delete post", error);
}

export async function cloudFetchPosts(): Promise<ScheduledPost[] | null> {
  if (!(await currentUserId())) return null;
  const { data, error } = await supabase.from("scheduled_posts").select("*").order("scheduled_for");
  if (error) return warn("fetch posts", error), null;
  return (data ?? []).map((r) => {
    const d = (r.details ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      videoName: String(d.videoName ?? ""),
      headline: String(d.headline ?? ""),
      caption: r.caption ?? "",
      accounts: Array.isArray(d.accounts) ? (d.accounts as string[]) : [],
      format: (r.format as ScheduledPost["format"]) ?? "reels",
      publishAt: r.scheduled_for ?? r.created_at,
      coverSecond: Number(d.coverSecond ?? 1),
      status: fromDbStatus(r.status),
      createdAt: r.created_at,
      videoPath: typeof d.videoPath === "string" ? d.videoPath : undefined,
    };
  });
}

/** Envia o vídeo processado de um post para a nuvem (necessário para postar no Instagram). */
export async function cloudUploadPostVideo(blobUrl: string, name: string): Promise<string | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  try {
    const blob = await (await fetch(blobUrl)).blob();
    const path = `${uid}/posts/${crypto.randomUUID()}-${safeName(name || "video.mp4")}`;
    const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, blob, { contentType: blob.type || "video/mp4" });
    if (error) return warn("upload post video", error), null;
    return path;
  } catch (e) {
    return warn("upload post video", e), null;
  }
}
