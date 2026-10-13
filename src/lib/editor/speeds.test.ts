import { describe, expect, test } from "bun:test";
import { clampSpeed, formatSpeed, SPEED_PRESETS } from "./speeds";

describe("speed options", () => {
  test("offers the subtle 1.01 and 1.02 presets", () => {
    expect(SPEED_PRESETS.some((o) => o.v === 1.01)).toBe(true);
    expect(SPEED_PRESETS.some((o) => o.v === 1.02)).toBe(true);
  });

  test("typed custom speed is kept exactly when valid", () => {
    expect(clampSpeed(1.01)).toBe(1.01);
    expect(clampSpeed(1.03)).toBe(1.03);
    expect(clampSpeed(0.97)).toBe(0.97);
  });

  test("typed speed is clamped to the engine range 0.5–2", () => {
    expect(clampSpeed(5)).toBe(2);
    expect(clampSpeed(0.1)).toBe(0.5);
  });

  test("invalid or empty input falls back to normal speed", () => {
    expect(clampSpeed(NaN)).toBe(1);
    expect(clampSpeed(0)).toBe(1);
  });

  test("formatSpeed shows two decimals with comma", () => {
    expect(formatSpeed(1.01)).toBe("1,01×");
    expect(formatSpeed(1)).toBe("1,00×");
  });
});
