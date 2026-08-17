import { create } from "zustand";

export type AIProvider = "openai" | "gemini" | "custom";

export interface AIConfig {
  /** Enables AI features across the editor. */
  enabled: boolean;
  provider: AIProvider;
  apiKey: string;
  /** Only used for provider = custom (OpenAI-compatible endpoint). */
  baseUrl: string;
  /** Chat/text model used to generate titles. */
  textModel: string;
  /** Speech-to-text model used to transcribe audio. */
  audioModel: string;
  /** Extra system instruction applied to title generation. */
  systemPrompt: string;
}

export const PROVIDER_DEFAULTS: Record<AIProvider, Pick<AIConfig, "baseUrl" | "textModel" | "audioModel">> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    textModel: "gpt-4o-mini",
    audioModel: "whisper-1",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    textModel: "gemini-2.0-flash",
    audioModel: "gemini-2.0-flash",
  },
  custom: {
    baseUrl: "",
    textModel: "",
    audioModel: "",
  },
};

export const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  provider: "openai",
  apiKey: "",
  ...PROVIDER_DEFAULTS.openai,
  systemPrompt:
    "Você cria títulos curtos, em português do Brasil, para vídeos verticais de redes sociais. Máximo 60 caracteres, sem aspas, sem hashtags, sem numeração.",
};

const STORAGE_KEY = "labremix:ai:v1";
const GATE_KEY = "labremix:ai:admin";

function load(): AIConfig {
  if (typeof window === "undefined") return { ...DEFAULT_AI_CONFIG };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    return { ...DEFAULT_AI_CONFIG, ...(JSON.parse(raw) as Partial<AIConfig>) };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

function save(cfg: AIConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

interface AIState {
  config: AIConfig;
  hydrated: boolean;
  /** True when the current browser session unlocked the admin panel. */
  isAdmin: boolean;
  hydrate: () => void;
  update: (patch: Partial<AIConfig>) => void;
  setProvider: (p: AIProvider) => void;
  reset: () => void;
  unlock: (code: string) => boolean;
  lock: () => void;
  setAdminCode: (code: string) => void;
  hasAdminCode: () => boolean;
}

export const useAI = create<AIState>((set, get) => ({
  config: { ...DEFAULT_AI_CONFIG },
  hydrated: false,
  isAdmin: false,

  hydrate: () => {
    if (get().hydrated) return;
    const admin =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("labremix:ai:session") === "1";
    set({ config: load(), hydrated: true, isAdmin: admin });
  },

  update: (patch) =>
    set((s) => {
      const config = { ...s.config, ...patch };
      save(config);
      return { config };
    }),

  setProvider: (p) =>
    set((s) => {
      const config = { ...s.config, provider: p, ...PROVIDER_DEFAULTS[p] };
      save(config);
      return { config };
    }),

  reset: () =>
    set(() => {
      save({ ...DEFAULT_AI_CONFIG });
      return { config: { ...DEFAULT_AI_CONFIG } };
    }),

  hasAdminCode: () =>
    typeof window !== "undefined" && !!window.localStorage.getItem(GATE_KEY),

  setAdminCode: (code) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(GATE_KEY, code);
    window.sessionStorage.setItem("labremix:ai:session", "1");
    set({ isAdmin: true });
  },

  unlock: (code) => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(GATE_KEY);
    if (stored && stored === code) {
      window.sessionStorage.setItem("labremix:ai:session", "1");
      set({ isAdmin: true });
      return true;
    }
    return false;
  },

  lock: () => {
    if (typeof window !== "undefined")
      window.sessionStorage.removeItem("labremix:ai:session");
    set({ isAdmin: false });
  },
}));

export function aiReady(cfg: AIConfig): boolean {
  return cfg.enabled && cfg.apiKey.trim().length > 0 && cfg.baseUrl.trim().length > 0;
}
