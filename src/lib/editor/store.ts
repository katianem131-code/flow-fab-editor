import { create } from "zustand";
import {
  BorderSettings,
  DEFAULT_BORDERS,
  DEFAULT_LOWER,
  DEFAULT_TITLE,
  TextOverlaySettings,
  OverlaySettings,
  OverlayPreset,
  DEFAULT_OVERLAY,
  MAX_OVERLAY_PRESETS,
  StylePreset,
  MAX_STYLE_PRESETS,
  VideoItem,
  VideoStatus,
} from "./types";

const STORAGE_KEY = "labremix:presets:v1";

interface PersistedShape {
  stylePresets: StylePreset[];
  overlayPresets: OverlayPreset[];
}

function loadPersisted(): PersistedShape {
  if (typeof window === "undefined") return { stylePresets: [], overlayPresets: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { stylePresets: [], overlayPresets: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    return {
      stylePresets: Array.isArray(parsed.stylePresets) ? parsed.stylePresets : [],
      overlayPresets: Array.isArray(parsed.overlayPresets) ? parsed.overlayPresets : [],
    };
  } catch {
    return { stylePresets: [], overlayPresets: [] };
  }
}

function persist(data: PersistedShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded — ignore */
  }
}


interface EditorState {
  items: VideoItem[];
  selectedId: string | null;
  globalBorders: BorderSettings;
  globalTitle: TextOverlaySettings;
  globalLower: TextOverlaySettings;
  overlay: OverlaySettings;
  overlayPresets: OverlayPreset[];
  stylePresets: StylePreset[];
  editMode: "batch" | "single";
  engineReady: boolean;
  engineLoading: boolean;
  engineError: string | null;

  addFiles: (files: File[]) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
  select: (id: string) => void;

  setEditMode: (mode: "batch" | "single") => void;
  updateGlobalBorders: (patch: Partial<BorderSettings>) => void;
  updateItemBorders: (id: string, patch: Partial<BorderSettings>) => void;
  updateGlobalTitle: (patch: Partial<TextOverlaySettings>) => void;
  updateGlobalLower: (patch: Partial<TextOverlaySettings>) => void;
  setTitleOverride: (id: string, text: string) => void;
  updateOverlay: (patch: Partial<OverlaySettings>) => void;
  addOverlayPreset: (name: string, src: string) => void;
  removeOverlayPreset: (id: string) => void;
  applyOverlayPreset: (id: string) => void;

  saveStylePreset: (name: string) => void;
  applyStylePreset: (id: string) => void;
  removeStylePreset: (id: string) => void;
  renameStylePreset: (id: string, name: string) => void;
  hydratePresets: () => void;

  resetAll: () => void;

  setEngine: (s: Partial<Pick<EditorState, "engineReady" | "engineLoading" | "engineError">>) => void;
  setItemStatus: (id: string, status: VideoStatus, extra?: Partial<VideoItem>) => void;
  setItemProgress: (id: string, progress: number) => void;
  setItemOutput: (id: string, blob: Blob, name: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useEditor = create<EditorState>((set, get) => ({
  items: [],
  selectedId: null,
  globalBorders: { ...DEFAULT_BORDERS },
  globalTitle: { ...DEFAULT_TITLE },
  globalLower: { ...DEFAULT_LOWER },
  overlay: { ...DEFAULT_OVERLAY },
  overlayPresets: [],
  stylePresets: [],
  hydratePresets: () => {
    const data = loadPersisted();
    set({ stylePresets: data.stylePresets, overlayPresets: data.overlayPresets });
  },
  editMode: "batch",
  engineReady: false,
  engineLoading: false,
  engineError: null,

  addFiles: (files) => {
    const existing = get().items;
    const toAdd: VideoItem[] = [];
    for (const file of files) {
      if (existing.length + toAdd.length >= 50) break;
      toAdd.push({
        id: uid(),
        file,
        name: file.name,
        sizeMB: file.size / (1024 * 1024),
        previewUrl: URL.createObjectURL(file),
        status: "idle",
        progress: 0,
        borders: null,
      });
    }
    set((s) => ({
      items: [...s.items, ...toAdd],
      selectedId: s.selectedId ?? toAdd[0]?.id ?? null,
    }));
  },

  removeItem: (id) =>
    set((s) => {
      const item = s.items.find((i) => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
      }
      const items = s.items.filter((i) => i.id !== id);
      return {
        items,
        selectedId: s.selectedId === id ? (items[0]?.id ?? null) : s.selectedId,
      };
    }),

  clearAll: () =>
    set((s) => {
      s.items.forEach((i) => {
        URL.revokeObjectURL(i.previewUrl);
        if (i.outputUrl) URL.revokeObjectURL(i.outputUrl);
      });
      return { items: [], selectedId: null };
    }),

  select: (id) => set({ selectedId: id }),

  setEditMode: (mode) => set({ editMode: mode }),

  updateGlobalBorders: (patch) =>
    set((s) => ({ globalBorders: { ...s.globalBorders, ...patch } })),

  updateItemBorders: (id, patch) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id
          ? { ...i, borders: { ...(i.borders ?? s.globalBorders), ...patch } }
          : i,
      ),
    })),

  updateGlobalTitle: (patch) =>
    set((s) => ({ globalTitle: { ...s.globalTitle, ...patch } })),

  updateGlobalLower: (patch) =>
    set((s) => ({ globalLower: { ...s.globalLower, ...patch } })),

  setTitleOverride: (id, text) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, titleOverride: text } : i,
      ),
    })),

  updateOverlay: (patch) => set((s) => ({ overlay: { ...s.overlay, ...patch } })),

  addOverlayPreset: (name, src) =>
    set((s) => {
      if (s.overlayPresets.length >= MAX_OVERLAY_PRESETS) return s;
      const overlayPresets = [...s.overlayPresets, { id: uid(), name, src }];
      persist({ stylePresets: s.stylePresets, overlayPresets });
      return { overlayPresets };
    }),

  removeOverlayPreset: (id) =>
    set((s) => {
      const overlayPresets = s.overlayPresets.filter((p) => p.id !== id);
      persist({ stylePresets: s.stylePresets, overlayPresets });
      return { overlayPresets };
    }),

  applyOverlayPreset: (id) =>
    set((s) => {
      const p = s.overlayPresets.find((x) => x.id === id);
      if (!p) return s;
      return { overlay: { ...s.overlay, enabled: true, src: p.src, name: p.name } };
    }),

  saveStylePreset: (name) =>
    set((s) => {
      const preset: StylePreset = {
        id: uid(),
        name: name.trim() || `Ajuste ${s.stylePresets.length + 1}`,
        createdAt: Date.now(),
        borders: { ...s.globalBorders },
        title: { ...s.globalTitle },
        lower: { ...s.globalLower },
        overlay: { ...s.overlay },
      };
      const stylePresets = [preset, ...s.stylePresets].slice(0, MAX_STYLE_PRESETS);
      persist({ stylePresets, overlayPresets: s.overlayPresets });
      return { stylePresets };
    }),

  applyStylePreset: (id) =>
    set((s) => {
      const p = s.stylePresets.find((x) => x.id === id);
      if (!p) return s;
      return {
        globalBorders: { ...DEFAULT_BORDERS, ...p.borders },
        globalTitle: { ...DEFAULT_TITLE, ...p.title },
        globalLower: { ...DEFAULT_LOWER, ...p.lower },
        overlay: { ...DEFAULT_OVERLAY, ...p.overlay },
        items: s.items.map((i) => ({ ...i, borders: null })),
      };
    }),

  removeStylePreset: (id) =>
    set((s) => {
      const stylePresets = s.stylePresets.filter((p) => p.id !== id);
      persist({ stylePresets, overlayPresets: s.overlayPresets });
      return { stylePresets };
    }),

  renameStylePreset: (id, name) =>
    set((s) => {
      const stylePresets = s.stylePresets.map((p) =>
        p.id === id ? { ...p, name: name.trim() || p.name } : p,
      );
      persist({ stylePresets, overlayPresets: s.overlayPresets });
      return { stylePresets };
    }),


  resetAll: () =>
    set((s) => ({
      globalBorders: { ...DEFAULT_BORDERS },
      globalTitle: { ...DEFAULT_TITLE },
      globalLower: { ...DEFAULT_LOWER },
      overlay: { ...DEFAULT_OVERLAY },
      items: s.items.map((i) => ({ ...i, borders: null, titleOverride: undefined })),
    })),

  setEngine: (patch) => set((s) => ({ ...s, ...patch })),

  setItemStatus: (id, status, extra) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, status, ...(extra ?? {}) } : i,
      ),
    })),

  setItemProgress: (id, progress) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, progress } : i)),
    })),

  setItemOutput: (id, blob, name) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id
          ? {
              ...i,
              status: "done",
              progress: 1,
              outputUrl: URL.createObjectURL(blob),
              outputName: name,
            }
          : i,
      ),
    })),
}));

export function effectiveBorders(item: VideoItem, global: BorderSettings): BorderSettings {
  return item.borders ?? global;
}

/** Get the title text for a specific item, cycling through lines by index. */
export function titleTextForItem(
  item: VideoItem,
  itemIndex: number,
  title: TextOverlaySettings,
): string {
  if (item.titleOverride && item.titleOverride.trim().length > 0) {
    return item.titleOverride;
  }
  const lines = title.lines
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return title.text ?? "";
  return lines[itemIndex % lines.length];
}
