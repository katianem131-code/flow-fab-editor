export interface SpeedOption {
  v: number;
  label: string;
}

export const SPEED_PRESETS: SpeedOption[] = [
  { v: 0.75, label: "0,75× (câmera lenta)" },
  { v: 0.9, label: "0,90×" },
  { v: 0.95, label: "0,95×" },
  { v: 1, label: "1,00× (normal)" },
  { v: 1.01, label: "1,01× (sutil anti-dup)" },
  { v: 1.02, label: "1,02× (sutil anti-dup)" },
  { v: 1.03, label: "1,03× (sutil anti-dup)" },
  { v: 1.05, label: "1,05× (anti-dup recomendado)" },
  { v: 1.08, label: "1,08× (anti-dup)" },
  { v: 1.1, label: "1,10× (mais rápido)" },
  { v: 1.15, label: "1,15×" },
  { v: 1.25, label: "1,25×" },
  { v: 1.5, label: "1,50×" },
  { v: 2, label: "2,00×" },
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
