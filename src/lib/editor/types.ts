export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9";

export interface BorderSettings {
  zoom: number; // 50 - 200, percent
  posY: number; // 0 - 100
  posX: number; // 0 - 100
  color: string; // hex
  aspect: AspectRatio;
}

export const DEFAULT_BORDERS: BorderSettings = {
  zoom: 100,
  posY: 50,
  posX: 50,
  color: "#ffffff",
  aspect: "9:16",
};

export type VideoStatus =
  | "idle"
  | "queued"
  | "processing"
  | "done"
  | "error";

export interface VideoItem {
  id: string;
  file: File;
  name: string;
  sizeMB: number;
  previewUrl: string;
  status: VideoStatus;
  progress: number; // 0..1
  error?: string;
  outputUrl?: string;
  outputName?: string;
  // Per-video overrides (null = follow global batch settings)
  borders: BorderSettings | null;
}

export const ASPECT_DIMS: Record<AspectRatio, { w: number; h: number }> = {
  "9:16": { w: 720, h: 1280 },
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 864, h: 1080 },
  "16:9": { w: 1280, h: 720 },
};

export const MAX_VIDEOS = 50;
export const MAX_SIZE_MB = 100;
export const MAX_DURATION_S = 180;
