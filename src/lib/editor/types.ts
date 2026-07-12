export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9";

export interface BorderSettings {
  zoom: number;
  posY: number;
  posX: number;
  color: string;
  aspect: AspectRatio;
}

export const DEFAULT_BORDERS: BorderSettings = {
  zoom: 100,
  posY: 50,
  posX: 50,
  color: "#ffffff",
  aspect: "9:16",
};

export type TextPosition =
  | "top"
  | "top-upper"
  | "center"
  | "top-lower"
  | "bottom"
  | "free";

export const POSITION_PRESETS: Record<
  Exclude<TextPosition, "free">,
  { x: number; y: number }
> = {
  top: { x: 50, y: 5 },
  "top-upper": { x: 50, y: 25 },
  center: { x: 50, y: 50 },
  "top-lower": { x: 50, y: 75 },
  bottom: { x: 50, y: 95 },
};

export interface TextOverlaySettings {
  enabled: boolean;
  text: string; // for lower / fallback
  lines: string; // multiline (title only) — one per video
  font: "system" | "serif" | "mono";
  position: TextPosition;
  posX: number;
  posY: number;
  fontSize: number; // percent of frame height (1..10)
  color: string;
  background: boolean;
  backgroundColor: string;
}

export const DEFAULT_TITLE: TextOverlaySettings = {
  enabled: false,
  text: "",
  lines: "",
  font: "system",
  position: "top",
  posX: 50,
  posY: 50,
  fontSize: 4,
  color: "#000000",
  background: false,
  backgroundColor: "#ffffff",
};

export const DEFAULT_LOWER: TextOverlaySettings = {
  enabled: false,
  text: "Texto exibido em todos os vídeos",
  lines: "",
  font: "system",
  position: "top-lower",
  posX: 50,
  posY: 75,
  fontSize: 4,
  color: "#000000",
  background: false,
  backgroundColor: "#ffffff",
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
  progress: number;
  error?: string;
  outputUrl?: string;
  outputName?: string;
  borders: BorderSettings | null;
  /** Per-video title text override — replaces the cycled line for this video only. */
  titleOverride?: string;
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
