import { DEFAULT_BORDERS, DEFAULT_SECOND_MEDIA, type BorderSettings } from "./types";

export interface VideoTemplate {
  id: string;
  name: string;
  borders: BorderSettings;
  surface: "light" | "dark" | "yellow";
  isCustom?: boolean;
  sampleHeadline?: string;
}

function template(
  id: string,
  name: string,
  patch: Partial<BorderSettings>,
  surface: VideoTemplate["surface"] = "light",
  sampleHeadline?: string,
): VideoTemplate {
  return { id, name, borders: { ...DEFAULT_BORDERS, ...patch }, surface, sampleHeadline };
}

// Only framing is changed: titles, lower text and image overlays remain intact.
export const VIDEO_TEMPLATES: VideoTemplate[] = [
  template(
    "two-videos",
    "Studio - Dois vídeos",
    {
      borderTop: 0,
      borderBottom: 0,
      borderLeft: 0,
      borderRight: 0,
      color: "#000000",
      secondMedia: {
        ...DEFAULT_SECOND_MEDIA,
        enabled: true,
        name: "Vídeo 2 (gameplay / satisfying)",
        splitRatio: 50,
        gap: 1.5,
      },
    },
    "dark",
    "meu maior arrependimento foi não ter seguido essa página antes 😜",
  ),
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

const CUSTOM_KEY = "labremix:custom-templates:v1";

export function loadCustomTemplates(): VideoTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplate(tpl: VideoTemplate): VideoTemplate[] {
  if (typeof window === "undefined") return [];
  const list = loadCustomTemplates().filter((t) => t.id !== tpl.id);
  const updated = [{ ...tpl, isCustom: true }, ...list];
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
  return updated;
}

export function deleteCustomTemplate(id: string): VideoTemplate[] {
  if (typeof window === "undefined") return [];
  const updated = loadCustomTemplates().filter((t) => t.id !== id);
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
  return updated;
}

export function getAllTemplates(): VideoTemplate[] {
  return [...loadCustomTemplates(), ...VIDEO_TEMPLATES];
}

export function matchesTemplate(borders: BorderSettings, template: VideoTemplate): boolean {
  if (template.borders.secondMedia?.enabled !== borders.secondMedia?.enabled) {
    return false;
  }
  return (Object.keys(template.borders) as (keyof BorderSettings)[]).every((key) => {
    if (key === "secondMedia") return true;
    return borders[key] === template.borders[key];
  });
}