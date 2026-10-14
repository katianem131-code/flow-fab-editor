import { useEffect, useState } from "react";

export type ImportProvider = "demo" | "rapidapi" | "apify" | "custom";
export type ImportSettings = { provider: ImportProvider; apiKey: string; endpoint: string };
export type ImportHistoryEntry = { id: string; at: number; kind: "links" | "profile"; label: string; count: number };

const SKEY = "labremix.import.settings";
const HKEY = "labremix.import.history";
const DEFAULT: ImportSettings = { provider: "demo", apiKey: "", endpoint: "" };

export const PROVIDER_LABEL: Record<ImportProvider, string> = {
  demo: "Demonstração (sem serviço)",
  rapidapi: "RapidAPI",
  apify: "Apify",
  custom: "Endpoint próprio",
};

function read<T>(k: string, fb: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}

export function loadImportSettings(): ImportSettings {
  return { ...DEFAULT, ...read(SKEY, DEFAULT) };
}
export function saveImportSettings(s: ImportSettings) {
  localStorage.setItem(SKEY, JSON.stringify(s));
}

export function loadHistory(): ImportHistoryEntry[] {
  return read<ImportHistoryEntry[]>(HKEY, []);
}
export function pushHistory(e: Omit<ImportHistoryEntry, "id" | "at">) {
  const list = [{ ...e, id: crypto.randomUUID(), at: Date.now() }, ...loadHistory()].slice(0, 20);
  localStorage.setItem(HKEY, JSON.stringify(list));
  return list;
}
export function clearHistory() {
  localStorage.removeItem(HKEY);
}

export function useImportSettings() {
  const [s, setS] = useState<ImportSettings>(DEFAULT);
  useEffect(() => setS(loadImportSettings()), []);
  return s;
}
