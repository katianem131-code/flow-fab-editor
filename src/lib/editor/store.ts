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
  VideoItem,
  VideoStatus,
} from "./types";

interface EditorState {
  items: VideoItem[];
  selectedId: string | null;
  globalBorders: BorderSettings;
  globalTitle: TextOverlaySettings;
  globalLower: TextOverlaySettings;
  overlay: OverlaySettings;
  overlayPresets: OverlayPreset[];
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
  updateOverlay: (patch) => set((s) => ({ overlay: { ...s.overlay, ...patch } })),

  addOverlayPreset: (name, src) =>
    set((s) =>
      s.overlayPresets.length >= MAX_OVERLAY_PRESETS
        ? s
        : { overlayPresets: [...s.overlayPresets, { id: uid(), name, src }] },
    ),

  removeOverlayPreset: (id) =>
    set((s) => ({ overlayPresets: s.overlayPresets.filter((p) => p.id !== id) })),

  applyOverlayPreset: (id) =>
    set((s) => {
      const p = s.overlayPresets.find((x) => x.id === id);
      if (!p) return s;
      return { overlay: { ...s.overlay, enabled: true, src: p.src, name: p.name } };
    }),

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
    set((s) =>
      s.overlayPresets.length >= MAX_OVERLAY_PRESETS
        ? s
        : { overlayPresets: [...s.overlayPresets, { id: uid(), name, src }] },
    ),

  removeOverlayPreset: (id) =>
    set((s) => ({ overlayPresets: s.overlayPresets.filter((p) => p.id !== id) })),

  applyOverlayPreset: (id) =>
    set((s) => {
      const p = s.overlayPresets.find((x) => x.id === id);
      if (!p) return s;
      return { overlay: { ...s.overlay, enabled: true, src: p.src, name: p.name } };
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
