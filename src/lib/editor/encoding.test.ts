import { describe, expect, test } from "bun:test";
import { EXPORT_ENCODER_ARGS, EXPORT_FPS_FILTER } from "./encoding";

describe("fast video export", () => {
  test("uses the ultrafast encoding preset", () => {
    expect([...EXPORT_ENCODER_ARGS]).toEqual(["-preset", "ultrafast"]);
  });

  test("converts exported video to 30 fps", () => {
    expect(EXPORT_FPS_FILTER).toBe("fps=30");
  });
});