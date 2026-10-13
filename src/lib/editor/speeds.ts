export interface SpeedOption {
  v: number;
  label: string;
}

export const SPEED_PRESETS: SpeedOption[] = [
  { v: 0.9, label: "0,90× (mais lento)" },
  { v: 0.95, label: "0,95×" },
  { v: 1, label: "normal" },
  { v: 1.01, label: "1,01×" },
  { v: 1.02, label: "1,02×" },
  { v: 1.05, label: "1,05×" },
  { v: 1.1, label: "1,10× (mais rápido)" },
];

/** Sentinel used by the speed select for the typed "Outros" value. */
export const CUSTOM_SPEED = "custom";

/** Clamp a typed speed to what the engine supports (0.5–2), rounded to 2 decimals. */
export function clampSpeed(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 1;
  return Math.round(Math.max(0.5, Math.min(2, v)) * 100) / 100;
}

export function formatSpeed(v: number): string {
  return `${v.toFixed(2).replace(".", ",")}×`;
}
