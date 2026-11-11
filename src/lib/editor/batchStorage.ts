import { cloudUploadBatchFiles, cloudLoadBatchFiles } from "@/lib/cloud/sync";
// Persistência local de mídias de lotes (arquivos File/Blob) usando IndexedDB
// Permite que ao clicar em um projeto/lote recente, os vídeos sejam restaurados mesmo após recarregar a página.

const DB_NAME = "labremix_media_db";
const DB_VERSION = 1;
const STORE_NAME = "batch_files";

interface StoredFileRecord {
  id: string; // `${batchId}_${index}`
  batchId: string;
  name: string;
  type: string;
  blob: Blob;
  size: number;
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

/** Salva todos os arquivos de um lote no IndexedDB */
export async function saveBatchFiles(batchId: string, files: File[]): Promise<void> {
  if (!files || files.length === 0) return;
  void cloudUploadBatchFiles(batchId, files);
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Salva cada arquivo
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const record: StoredFileRecord = {
        id: `${batchId}_${i}_${f.name}`,
        batchId,
        name: f.name,
        type: f.type || "video/mp4",
        blob: f,
        size: f.size,
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

/** Carrega os arquivos reais de um lote armazenados no IndexedDB */
export async function loadBatchFiles(batchId: string): Promise<File[]> {
  const local = await loadLocalBatchFiles(batchId);
  if (local.length > 0) return local;
  return cloudLoadBatchFiles(batchId).catch(() => []);
}

async function loadLocalBatchFiles(batchId: string): Promise<File[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("batchId");
    const req = index.getAll(IDBKeyRange.only(batchId));

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const records = (req.result as StoredFileRecord[]) || [];
        const files = records.map((r) => {
          return new File([r.blob], r.name, {
            type: r.type || "video/mp4",
            lastModified: Date.now(),
          });
        });
        resolve(files);
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

