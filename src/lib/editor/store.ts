import { create } from "zustand";
import {
  BorderSettings,
  DEFAULT_BORDERS,
  VideoItem,
  VideoStatus,
} from "./types";

interface EditorState {
  items: VideoItem[];
  selectedId: string | null;
  globalBorders: BorderSettings;
  editMode: "batch" | "single"; // which pane is active for the selected item
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
  editMode: "batch",
  engineReady: false,
  engineLoading: false,
  engineError: null,

  addFiles: (files) => {
    const existing = get().items;
    const toAdd: VideoItem[] = [];
    for (const file of files) {
      if (existing.length + toAdd.length >= 50) break;
      const item: VideoItem = {
        id: uid(),
        file,
        name: file.name,
        sizeMB: file.size / (1024 * 1024),
        previewUrl: URL.createObjectURL(file),
        status: "idle",
        progress: 0,
        borders: null,
      };
      toAdd.push(item);
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
        selectedId:
          s.selectedId === id ? (items[0]?.id ?? null) : s.selectedId,
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
          ? {
              ...i,
              borders: { ...(i.borders ?? s.globalBorders), ...patch },
            }
          : i,
      ),
    })),

  resetAll: () =>
    set((s) => ({
      globalBorders: { ...DEFAULT_BORDERS },
      items: s.items.map((i) => ({ ...i, borders: null })),
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
