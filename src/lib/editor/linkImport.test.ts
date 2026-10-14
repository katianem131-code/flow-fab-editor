import { describe, it, expect } from "vitest";
import { detectPlatform, parseLinks, normalizeUsername } from "./linkImport";

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
});
