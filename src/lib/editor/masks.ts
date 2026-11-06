import { create } from "zustand";

export type MaskMode = "blur" | "solid" | "gradient";

export interface MaskBox {
  id: string;
  mode: MaskMode;
  /** Position/size as % of the final frame. */
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  blur: number; // 1..30
}

const KEY = "labremix.masks.v1";

function load(): MaskBox[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

interface MaskState {
  enabled: boolean;
  masks: MaskBox[];
  selected: string | null;
  hydrate: () => void;
  setEnabled: (v: boolean) => void;
  add: (mode: MaskMode, preset?: Partial<MaskBox>) => void;
  update: (id: string, patch: Partial<MaskBox>) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
}

const save = (masks: MaskBox[]) => {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(masks));
};

export const useMasks = create<MaskState>((set) => ({
  enabled: true,
  masks: [],
  selected: null,
  hydrate: () => set({ masks: load() }),
  setEnabled: (enabled) => set({ enabled }),
  add: (mode, preset) =>
    set((s) => {
      const m: MaskBox = {
        id: Math.random().toString(36).slice(2, 9),
        mode,
        x: 10,
        y: 80,
        w: 80,
        h: 10,
        color: "#000000",
        blur: 20,
        ...preset,
      };
      const masks = [...s.masks, m];
      save(masks);
      return { masks, selected: m.id };
    }),
  update: (id, patch) =>
    set((s) => {
      const masks = s.masks.map((m) => (m.id === id ? { ...m, ...patch } : m));
      save(masks);
      return { masks };
    }),
  remove: (id) =>
    set((s) => {
      const masks = s.masks.filter((m) => m.id !== id);
      save(masks);
      return { masks, selected: null };
    }),
  select: (selected) => set({ selected }),
}));

/** Build an ffmpeg filter fragment (applied to a WxH frame) for all masks. */
export function buildMaskFilter(masks: MaskBox[], W: number, H: number): string {
  const parts: string[] = [];
  for (const m of masks) {
    const x = Math.max(0, Math.round((m.x / 100) * W));
    const y = Math.max(0, Math.round((m.y / 100) * H));
    const w = Math.max(2, Math.min(W - x, Math.round((m.w / 100) * W)));
    const h = Math.max(2, Math.min(H - y, Math.round((m.h / 100) * H)));
    const c = m.color.replace("#", "0x");
    if (m.mode === "solid") parts.push(`drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${c}@1:t=fill`);
    else if (m.mode === "gradient") parts.push(`drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${c}@0.75:t=fill`);
    else {
      const ew = w - (w % 2), eh = h - (h % 2);
      const r = Math.max(1, Math.min(Math.floor(Math.min(ew, eh) / 2) - 1, Math.round(m.blur)));
      parts.push(`split[mb${parts.length}a][mb${parts.length}b];[mb${parts.length}b]crop=${ew}:${eh}:${x}:${y},boxblur=${r}:2[mb${parts.length}c];[mb${parts.length}a][mb${parts.length}c]overlay=${x}:${y}`);
    }
  }
  return parts.join(",");
}
