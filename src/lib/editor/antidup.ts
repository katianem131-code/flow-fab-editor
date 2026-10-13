import { create } from "zustand";

export interface AntiDupSettings {
  enabled: boolean;
  mirror: boolean;
  stripMetadata: boolean;
  speed: number; // 1 = normal
  trimStart: number; // seconds
  trimEnd: number; // seconds
}

export const DEFAULT_ANTIDUP: AntiDupSettings = {
  enabled: true,
  mirror: false,
  stripMetadata: true,
  speed: 1,
  trimStart: 0.5,
  trimEnd: 0.5,
};

const KEY = "labremix:antidup:v1";

export function antiDupLevel(s: AntiDupSettings): "Desligado" | "Fraca" | "Boa" | "Forte" {
  if (!s.enabled) return "Desligado";
  let score = 0;
  if (s.mirror) score += 2;
  if (s.stripMetadata) score += 1;
  if (s.speed !== 1) score += 1;
  if (s.trimStart + s.trimEnd > 0) score += 1;
  return score >= 4 ? "Forte" : score >= 2 ? "Boa" : "Fraca";
}

interface AntiDupStore {
  antiDup: AntiDupSettings;
  updateAntiDup: (p: Partial<AntiDupSettings>) => void;
  hydrateAntiDup: () => void;
}

export const useAntiDup = create<AntiDupStore>((set, get) => ({
  antiDup: { ...DEFAULT_ANTIDUP },
  updateAntiDup: (p) => {
    const antiDup = { ...get().antiDup, ...p };
    set({ antiDup });
    try {
      window.localStorage.setItem(KEY, JSON.stringify(antiDup));
    } catch {
      /* ignore */
    }
  },
  hydrateAntiDup: () => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) set({ antiDup: { ...DEFAULT_ANTIDUP, ...JSON.parse(raw) } });
    } catch {
      /* ignore */
    }
  },
}));

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = v.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    v.src = url;
  });
}
