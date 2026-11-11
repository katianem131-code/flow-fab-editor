// Local registry of import batches ("lotes"). Only metadata is stored; the
// media files themselves live in memory for the current session.
import { cloudSaveBatch, cloudRenameBatch, cloudRemoveBatch, cloudFetchBatches } from "@/lib/cloud/sync";

export type BatchDestination = "editor" | "ai";

export interface BatchRecord {
  id: string;
  name: string;
  createdAt: string; // ISO
  videoCount: number;
  imageCount: number;
  linkCount: number;
  fileNames: string[];
  destination?: BatchDestination;
}

const KEY = "labremix:batches:v1";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Folder-style label: Lote_2026-11-05_15h00 (+ _Nome when given). */
export function buildBatchLabel(date: Date, name: string): string {
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}h${pad(date.getMinutes())}`;
  const clean = name.trim().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
  return clean ? `Lote_${stamp}_${clean}` : `Lote_${stamp}`;
}

export function loadBatches(): BatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBatch(rec: BatchRecord) {
  const list = [rec, ...loadBatches().filter((b) => b.id !== rec.id)].slice(0, 50);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  void cloudSaveBatch(rec);
  return list;
}

/** Junta os lotes salvos na nuvem (usuário logado) com o histórico local. */
export async function syncBatchesFromCloud(): Promise<BatchRecord[] | null> {
  const remote = await cloudFetchBatches();
  if (!remote) return null;
  const local = loadBatches();
  const ids = new Set(remote.map((b) => b.id));
  const merged = [...remote, ...local.filter((b) => !ids.has(b.id))]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
  return merged;
}

export function updateBatchName(id: string, newName: string) {
  const trimmed = newName.trim();
  const list = loadBatches().map((b) => (b.id === id ? { ...b, name: trimmed } : b));
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  void cloudRenameBatch(id, trimmed);
  return list;
}

export function removeBatch(id: string) {
  const list = loadBatches().filter((b) => b.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(list));
  void cloudRemoveBatch(id);
  return list;
}
