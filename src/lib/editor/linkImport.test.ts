import { describe, it, expect } from "vitest";
import { strToU8, zipSync } from "fflate";
import { detectPlatform, parseLinks, normalizeUsername, readImportedArchive } from "./linkImport";

describe("linkImport", () => {
  it("detects platforms", () => {
    expect(detectPlatform("https://www.instagram.com/reel/abc/")).toBe("instagram");
    expect(detectPlatform("https://www.tiktok.com/@x/video/1")).toBe("tiktok");
    expect(detectPlatform("https://youtube.com/shorts/xyz")).toBe("youtube");
    expect(detectPlatform("https://site.com/a.mp4")).toBe("direct");
    expect(detectPlatform("https://site.com/page")).toBe("unknown");
  });
  it("parses one link per line without duplicates", () => {
    expect(parseLinks("https://a.com/1.mp4\nhttps://a.com/1.mp4\nlixo")).toHaveLength(1);
  });
  it("normalizes usernames", () => {
    expect(normalizeUsername("@labremix")).toBe("labremix");
    expect(normalizeUsername("https://instagram.com/labremix/")).toBe("labremix");
  });
  it("accepts direct image links", () => {
    expect(detectPlatform("https://site.com/carrossel-01.jpg?x=1")).toBe("direct");
  });
  it("restores all carousel slides and their shared caption from the import archive", () => {
    const source = "https://www.instagram.com/p/example/";
    const zipped = zipSync({
      "_labremix-post.json": strToU8(JSON.stringify({
        caption: "Legenda de referência",
        files: [
          { name: "post_01.jpg", kind: "image", slideIndex: 1 },
          { name: "post_02.jpg", kind: "image", slideIndex: 2 },
          { name: "post_03.mp4", kind: "video", slideIndex: 3 },
        ],
      })),
      "post_01.jpg": strToU8("one"),
      "post_02.jpg": strToU8("two"),
      "post_03.mp4": strToU8("three"),
    });
    const buffer = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
    const post = readImportedArchive(buffer, source);
    expect(post.files).toHaveLength(3);
    expect(post.files.map((item) => item.kind)).toEqual(["image", "image", "video"]);
    expect(post.files.map((item) => item.source.slideIndex)).toEqual([1, 2, 3]);
    expect(post.files.every((item) => item.source.slideCount === 3 && item.source.caption === post.caption)).toBe(true);
    expect(new Set(post.files.map((item) => item.source.postId)).size).toBe(1);
  });
});
