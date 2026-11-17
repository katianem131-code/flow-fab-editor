import { describe, expect, it } from "vitest";
import {
  createCarouselSlide,
  createTextBox,
  duplicateCarouselSlide,
  mergeCarouselAssets,
  moveCarouselSlide,
  replaceCarouselBackground,
  wrapCarouselText,
  type CarouselSlide,
} from "./carousel";
import type { BatchAssetInput } from "./media";

function image(name: string): File {
  return new File([name], name, { type: "image/png" });
}

function slide(id: string): CarouselSlide {
  return { ...createCarouselSlide(image(`${id}.png`)), id, sourceAssetId: id };
}

describe("carousel editing", () => {
  it("replaces the photo without changing or removing any text layer", () => {
    const original = createCarouselSlide(image("before.png"));
    original.boxes = [
      createTextBox("Frase original"),
      { ...createTextBox("Segunda frase"), fontSize: 42 },
    ];
    const replaced = replaceCarouselBackground(original, image("after.jpg"));

    expect(replaced.background.name).toBe("after.jpg");
    expect(replaced.boxes).toEqual(original.boxes);
    expect(replaced.boxes[0].text).toBe("Frase original");
    expect(replaced.boxes[1].fontSize).toBe(42);
  });

  it("duplicates a slide with independent text layer IDs", () => {
    const original = createCarouselSlide(image("cover.png"));
    original.boxes = [createTextBox("Duplicar isto")];
    const copy = duplicateCarouselSlide(original);

    expect(copy.id).not.toBe(original.id);
    expect(copy.boxes[0].text).toBe("Duplicar isto");
    expect(copy.boxes[0].id).not.toBe(original.boxes[0].id);
    expect(copy.sourceAssetId).toBeUndefined();
  });

  it("moves slides forward and backward without changing their content", () => {
    const slides = [slide("a"), slide("b"), slide("c")];
    expect(moveCarouselSlide(slides, 0, 2).map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(moveCarouselSlide(slides, 2, 0).map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(slides.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("puts edited slides at the original group position and preserves other media", () => {
    const assets: BatchAssetInput[] = ["video", "one", "two", "other"].map((id) => ({
      id,
      file:
        id === "video" ? new File(["v"], "video.mp4", { type: "video/mp4" }) : image(`${id}.png`),
      kind: id === "video" ? "video" : "image",
    }));
    const edited: BatchAssetInput[] = ["one", "new", "two"].map((id) => ({
      id,
      file: image(`${id}.png`),
      kind: "image",
    }));
    expect(mergeCarouselAssets(assets, ["one", "two"], edited).map((asset) => asset.id)).toEqual([
      "video",
      "one",
      "new",
      "two",
      "other",
    ]);
  });

  it("wraps long words instead of allowing text to escape the stripe", () => {
    const lines = wrapCarouselText("Supercalifragilistico", 50, (value) => value.length * 10);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length * 10 <= 50)).toBe(true);
    expect(lines.join("")).toBe("Supercalifragilistico");
  });
});
