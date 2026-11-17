import { useEffect, useState } from "react";
import type { BatchAssetInput, MediaKind } from "./media";

export interface MediaPreview {
  id: string;
  kind: MediaKind;
  url: string;
}

/** Creates object URLs in an effect so React Strict Mode never revokes visible previews. */
export function useMediaPreviews(assets: Pick<BatchAssetInput, "id" | "file" | "kind">[]): MediaPreview[] {
  const [previews, setPreviews] = useState<MediaPreview[]>([]);
  const signature = assets.map((asset) => `${asset.id}:${asset.file.size}:${asset.file.lastModified}:${asset.kind}`).join("|");
  useEffect(() => {
    const next = assets.map((asset) => ({ id: asset.id, kind: asset.kind, url: URL.createObjectURL(asset.file) }));
    setPreviews(next);
    return () => next.forEach((preview) => URL.revokeObjectURL(preview.url));
    // The signature avoids rebuilding URLs when a parent recreates the same asset list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return previews;
}
