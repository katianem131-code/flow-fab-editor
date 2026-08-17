import { AIConfig, aiReady } from "./settings";

function endpoint(cfg: AIConfig, path: string) {
  return `${cfg.baseUrl.replace(/\/+$/, "")}${path}`;
}

function assertReady(cfg: AIConfig) {
  if (!aiReady(cfg)) {
    throw new Error(
      "IA não configurada. Abra o painel administrativo (/admin) e informe a chave da API.",
    );
  }
}

async function readError(res: Response) {
  const text = await res.text().catch(() => "");
  let msg = text;
  try {
    const j = JSON.parse(text) as { error?: { message?: string }; message?: string };
    msg = j.error?.message ?? j.message ?? text;
  } catch {
    /* keep raw */
  }
  if (res.status === 401) return "Chave de API inválida ou sem permissão (401).";
  if (res.status === 429) return "Limite de uso atingido no provedor (429). Tente de novo em instantes.";
  return msg || `Falha na API (${res.status}).`;
}

/** Simple connectivity/credential test used by the admin panel. */
export async function testConnection(cfg: AIConfig): Promise<string> {
  assertReady(cfg);
  const res = await fetch(endpoint(cfg, "/chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.textModel,
      messages: [{ role: "user", content: "Responda apenas com: ok" }],
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "ok";
}

/** Generate N short video titles. Returns one title per array entry. */
export async function generateTitles(
  cfg: AIConfig,
  brief: string,
  count: number,
): Promise<string[]> {
  assertReady(cfg);
  const n = Math.max(1, Math.min(50, count));
  const res = await fetch(endpoint(cfg, "/chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.textModel,
      messages: [
        { role: "system", content: cfg.systemPrompt },
        {
          role: "user",
          content: `Tema/briefing: ${brief}\n\nEscreva exatamente ${n} título(s), um por linha, sem numeração e sem aspas.`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content ?? "";
  return raw
    .split("\n")
    .map((l) => l.replace(/^\s*[-*\d.)]+\s*/, "").replace(/^["“”']|["“”']$/g, "").trim())
    .filter((l) => l.length > 0)
    .slice(0, n);
}

/** Transcribe an audio blob using an OpenAI-compatible /audio/transcriptions endpoint. */
export async function transcribeAudio(
  cfg: AIConfig,
  audio: Blob,
  filename = "audio.mp3",
): Promise<string> {
  assertReady(cfg);
  const fd = new FormData();
  fd.append("file", audio, filename);
  fd.append("model", cfg.audioModel);
  fd.append("response_format", "text");
  const res = await fetch(endpoint(cfg, "/audio/transcriptions"), {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: fd,
  });
  if (!res.ok) throw new Error(await readError(res));
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { text?: string };
    return (j.text ?? text).trim();
  } catch {
    return text.trim();
  }
}
