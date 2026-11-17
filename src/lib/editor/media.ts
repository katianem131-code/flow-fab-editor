export type MediaKind = "video" | "image";

/** Origin and carousel position of an imported item. */
export interface MediaSource {
  sourceUrl?: string;
  postId?: string;
  slideIndex?: number;
  slideCount?: number;
  caption?: string;
}

export interface BatchAssetInput {
  id: string;
  file: File;
  kind: MediaKind;
  source?: MediaSource;
}

export interface BatchAssetMetadata {
  id: string;
  name: string;
  type: MediaKind;
  sizeMB: number;
  source?: MediaSource;
}

export function mediaKind(file: File): MediaKind | null {
  if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name)) return "image";
  if (file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name)) return "video";
  return null;
}

export function assetMetadata(asset: BatchAssetInput): BatchAssetMetadata {
  return {
    id: asset.id,
    name: asset.file.name,
    type: asset.kind,
    sizeMB: asset.file.size / (1024 * 1024),
    source: asset.source,
  };
}

export function sharedCaption(assets: { source?: MediaSource }[]): string {
  const captions = new Set(
    assets
      .map((asset) => asset.source?.caption?.trim())
      .filter((caption): caption is string => Boolean(caption)),
  );
  return captions.size === 1 ? [...captions][0] : "";
}

export function formatSlideLabel(source?: MediaSource): string | null {
  if (!source?.slideCount || source.slideCount < 2 || !source.slideIndex) return null;
  return `Slide ${source.slideIndex}/${source.slideCount}`;
}
