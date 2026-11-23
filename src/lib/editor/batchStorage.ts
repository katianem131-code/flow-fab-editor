import { cloudUploadBatchFiles, cloudLoadBatchFiles } from "@/lib/cloud/sync";
import type { BatchAssetInput, MediaSource } from "./media";
// Persistência local de mídias de lotes (arquivos File/Blob) usando IndexedDB
// Permite que ao clicar em um projeto/lote recente, os vídeos sejam restaurados mesmo após recarregar a página.

const DB_NAME = "labremix_media_db";
const DB_VERSION = 1;
const STORE_NAME = "batch_files";

interface StoredFileRecord {
  id: string; // `${batchId}_${index}`
  assetId?: string;
  order?: number;
  batchId: string;
  name: string;
  type: string;
  blob: Blob;
  size: number;
  source?: MediaSource;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB não disponível"));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("batchId", "batchId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Salva vídeos, imagens e a ordem/origem dos slides de um lote no IndexedDB. */
export async function saveBatchFiles(batchId: string, assets: BatchAssetInput[]): Promise<void> {
  if (!assets || assets.length === 0) return;
  void cloudUploadBatchFiles(batchId, assets.map((asset) => asset.file));
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Salva cada arquivo com sua posição no carrossel e legenda de origem.
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const f = asset.file;
      const record: StoredFileRecord = {
        id: `${batchId}_${String(i).padStart(3, "0")}_${f.name}`,
        assetId: asset.id,
        order: i,
        batchId,
        name: f.name,
        type: f.type || (asset.kind === "image" ? "image/jpeg" : "video/mp4"),
        blob: f,
        size: f.size,
        source: asset.source,
      };
      store.put(record);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Falha ao salvar arquivos do lote no IndexedDB:", err);
  }
}

/** Substitui o conteúdo local quando o lote salvo representa apenas os itens marcados. */
export async function replaceBatchFiles(batchId: string, assets: BatchAssetInput[]): Promise<void> {
  await deleteBatchFiles(batchId);
  await saveBatchFiles(batchId, assets);
}

/** Carrega os arquivos reais e metadados de um lote armazenados no IndexedDB. */
export async function loadBatchFiles(batchId: string): Promise<BatchAssetInput[]> {
  const local = await loadLocalBatchFiles(batchId);
  if (local.length > 0) return local;
  const remote = await cloudLoadBatchFiles(batchId).catch(() => []);
  return remote.map((file, index) => ({
    id: `${batchId}-cloud-${index}`,
    file,
    kind: file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name) ? "image" : "video",
  }));
}

async function loadLocalBatchFiles(batchId: string): Promise<BatchAssetInput[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("batchId");
    const req = index.getAll(IDBKeyRange.only(batchId));

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const records = ((req.result as StoredFileRecord[]) || []).sort((a, b) =>
          (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
          (a.source?.postId ?? "").localeCompare(b.source?.postId ?? "") ||
          (a.source?.slideIndex ?? 0) - (b.source?.slideIndex ?? 0) ||
          a.id.localeCompare(b.id),
        );
        const assets = records.map((r, index) => {
          const file = new File([r.blob], r.name, {
            type: r.type || "video/mp4",
            lastModified: Date.now(),
          });
          return {
            id: r.assetId ?? (r.source?.postId ? `${r.source.postId}-${r.source.slideIndex ?? index + 1}` : `${batchId}-${index}`),
            file,
            kind: file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name) ? "image" as const : "video" as const,
            source: r.source,
          };
        });
        resolve(assets);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Falha ao carregar arquivos do lote do IndexedDB:", err);
    return [];
  }
}

/** Remove todos os arquivos de um lote do IndexedDB */
export async function deleteBatchFiles(batchId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("batchId");
    const req = index.getAllKeys(IDBKeyRange.only(batchId));

    req.onsuccess = () => {
      const keys = req.result;
      for (const k of keys) {
        store.delete(k);
      }
    };
  } catch (err) {
    console.warn("Falha ao deletar arquivos do lote do IndexedDB:", err);
  }
}

export interface BatchThumbnail {
  url: string;
  kind: "image" | "video";
  name: string;
}

/** Carrega a miniatura do primeiro arquivo salvo de um lote no IndexedDB */
export async function loadFirstBatchThumbnail(batchId: string): Promise<BatchThumbnail | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("batchId");

    return new Promise((resolve) => {
      const req = index.openCursor(IDBKeyRange.only(batchId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const rec = cursor.value as StoredFileRecord;
          const url = URL.createObjectURL(rec.blob);
          const kind =
            rec.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(rec.name)
              ? "image"
              : "video";
          resolve({ url, kind, name: rec.name });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}


