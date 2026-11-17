import { describe, expect, it } from "vitest";
import { defaultFormatForMedia, statusForFormat } from "./schedule";

describe("media scheduling rules", () => {
  it("uses a single-image draft for one photo", () => {
    expect(defaultFormatForMedia(["image"])).toBe("image");
    expect(statusForFormat("image", false)).toBe("draft");
  });

  it("keeps carousel slides together as a draft, including mixed media", () => {
    expect(defaultFormatForMedia(["image", "image", "image"])).toBe("carousel");
    expect(defaultFormatForMedia(["video", "image"])).toBe("carousel");
    expect(statusForFormat("carousel", true)).toBe("draft");
  });

  it("preserves existing automatic video scheduling behavior", () => {
    expect(defaultFormatForMedia(["video"])).toBe("reels");
    expect(statusForFormat("reels", false)).toBe("scheduled");
    expect(statusForFormat("stories", true)).toBe("publishing");
  });
});
