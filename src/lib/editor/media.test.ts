import { describe, expect, it } from "vitest";
import { assetMetadata, formatSlideLabel, mediaKind, sharedCaption, type BatchAssetInput } from "./media";

describe("batch media metadata", () => {
  it("preserves carousel position and caption when serializing an asset", () => {
    const file = new File(["photo"], "slide-2.jpg", { type: "image/jpeg" });
    const asset: BatchAssetInput = {
      id: "post-2",
      file,
      kind: "image",
      source: { postId: "post", slideIndex: 2, slideCount: 3, caption: "Legenda original", sourceUrl: "https://instagram.com/p/example" },
    };
    expect(assetMetadata(asset).source).toEqual(asset.source);
    expect(formatSlideLabel(asset.source)).toBe("Slide 2/3");
  });

  it("recognizes photo files even when the browser omits their MIME type", () => {
    expect(mediaKind(new File(["x"], "foto.JPG"))).toBe("image");
    expect(mediaKind(new File(["x"], "video.mp4"))).toBe("video");
  });

  it("uses the original caption only when all selected slides share it", () => {
    expect(sharedCaption([{ source: { caption: "Mesma" } }, { source: { caption: "Mesma" } }])).toBe("Mesma");
    expect(sharedCaption([{ source: { caption: "Uma" } }, { source: { caption: "Outra" } }])).toBe("");
  });
});
