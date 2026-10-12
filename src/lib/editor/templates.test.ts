import { beforeEach, describe, expect, test } from "bun:test";
import { useEditor, effectiveBorders } from "./store";
import { VIDEO_TEMPLATES } from "./templates";
import { DEFAULT_BORDERS, DEFAULT_TITLE, DEFAULT_LOWER, DEFAULT_OVERLAY, type VideoItem } from "./types";

const item = (id: string): VideoItem => ({ id, name: `${id}.mp4`, file: new File([], `${id}.mp4`), sizeMB: 0, previewUrl: "", status: "idle", progress: 0, borders: { ...DEFAULT_BORDERS, zoom: 170 } });
beforeEach(() => useEditor.setState({ items: [item("a"), item("b")], selectedId: "a", editMode: "batch", globalBorders: { ...DEFAULT_BORDERS }, globalTitle: { ...DEFAULT_TITLE, text: "Meu título" }, globalLower: { ...DEFAULT_LOWER }, overlay: { ...DEFAULT_OVERLAY, enabled: true, src: "image" } }));

describe("one-click framing templates", () => {
  test("one click applies chosen framing to every video in batch", () => {
    useEditor.getState().applyFramingTemplate("white-center");
    const state = useEditor.getState();
    const template = VIDEO_TEMPLATES.find((t) => t.id === "white-center");
    expect(template).toBeDefined();
    for (const video of state.items) expect(effectiveBorders(video, state.globalBorders)).toEqual(template?.borders);
    expect(state.globalBorders.borderTop).toBe(22);
    expect(state.globalBorders.borderBottom).toBe(22);
  });
  test("individual mode only changes the selected video", () => {
    useEditor.setState({ editMode: "single" });
    useEditor.getState().applyFramingTemplate("top-space");
    const state = useEditor.getState();
    expect(state.items[0]?.borders?.borderTop).toBe(35);
    expect(state.items[1]?.borders?.zoom).toBe(170);
    expect(state.globalBorders).toEqual(DEFAULT_BORDERS);
  });
  test("templates preserve existing text and image overlay", () => {
    const before = useEditor.getState();
    useEditor.getState().applyFramingTemplate("square");
    const after = useEditor.getState();
    expect(after.globalTitle).toEqual(before.globalTitle);
    expect(after.globalLower).toEqual(before.globalLower);
    expect(after.overlay).toEqual(before.overlay);
    expect(after.globalBorders.aspect).toBe("1:1");
  });
});