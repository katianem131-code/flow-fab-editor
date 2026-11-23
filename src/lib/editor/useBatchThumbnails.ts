import { useEffect, useState } from "react";
import { loadFirstBatchThumbnail, type BatchThumbnail } from "./batchStorage";
import type { BatchRecord } from "./batches";

export function useBatchThumbnails(batches: BatchRecord[]): Record<string, BatchThumbnail> {
  const [thumbnails, setThumbnails] = useState<Record<string, BatchThumbnail>>({});
  const batchIdsKey = batches.map((b) => b.id).join(",");

  useEffect(() => {
    let cancelled = false;
    const activeUrls: string[] = [];

    const loadAll = async () => {
      const result: Record<string, BatchThumbnail> = {};
      for (const batch of batches) {
        if (cancelled) break;
        const thumb = await loadFirstBatchThumbnail(batch.id);
        if (thumb) {
          activeUrls.push(thumb.url);
          result[batch.id] = thumb;
        }
      }
      if (!cancelled) {
        setThumbnails(result);
      } else {
        activeUrls.forEach((url) => URL.revokeObjectURL(url));
      }
    };

    void loadAll();

    return () => {
      cancelled = true;
      activeUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [batchIdsKey]);

  return thumbnails;
}

