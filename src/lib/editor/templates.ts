import { DEFAULT_BORDERS, type BorderSettings } from "./types";

export interface VideoTemplate {
  id: string;
  name: string;
  borders: BorderSettings;
  surface: "light" | "dark" | "yellow";
}

function template(id: string, name: string, patch: Partial<BorderSettings>, surface: VideoTemplate["surface"] = "light"): VideoTemplate {
  return { id, name, borders: { ...DEFAULT_BORDERS, ...patch }, surface };
}

// Only framing is changed: titles, lower text and image overlays remain intact.
export const VIDEO_TEMPLATES: VideoTemplate[] = [
  template("white-center", "Faixas brancas", { borderTop: 22, borderBottom: 22 }),
  template("dark-center", "Faixas escuras", { borderTop: 22, borderBottom: 22, color: "#14213D" }, "dark"),
  template("headline", "Manchete amarela", { borderTop: 30, borderBottom: 12, color: "#E6C51A" }, "yellow"),
  template("top-space", "Espaço no topo", { borderTop: 35, borderBottom: 5 }),
  template("bottom-space", "Espaço no rodapé", { borderTop: 5, borderBottom: 35 }),
  template("inset", "Moldura", { borderTop: 15, borderBottom: 15, borderLeft: 8, borderRight: 8 }),
  template("full", "Tela inteira", { color: "#14213D" }, "dark"),
  template("square", "Quadrado 1:1", { aspect: "1:1", borderTop: 12, borderBottom: 12 }),
  template("portrait", "Retrato 4:5", { aspect: "4:5", borderTop: 15, borderBottom: 15 }),
];

export function matchesTemplate(borders: BorderSettings, template: VideoTemplate): boolean {
  return (Object.keys(template.borders) as (keyof BorderSettings)[]).every(
    (key) => borders[key] === template.borders[key],
  );
}