import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_VIDEOS = 20;
const MAX_FRAMES = 3;
const MAX_FRAME = 300_000;
export const HEADLINE_TONES = ["Curiosidade", "Polêmica", "Lista / número", "Resultado rápido"] as const;

interface VideoInput { name: string; frames: string[] }

/** One hook headline per video, based on its first seconds. */
export const suggestHeadlines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { videos: VideoInput[]; tone?: string; brief?: string }) => {
    const videos = Array.isArray(input?.videos) ? input.videos.slice(0, MAX_VIDEOS) : [];
    if (!videos.length) throw new Error("Nenhum vídeo.");
    for (const v of videos) {
      if (!Array.isArray(v?.frames) || !v.frames.length) throw new Error("Quadros ausentes.");
      v.frames = v.frames.slice(0, MAX_FRAMES);
      for (const f of v.frames)
        if (typeof f !== "string" || !f.startsWith("data:image/") || f.length > MAX_FRAME) throw new Error("Quadro inválido.");
      v.name = String(v.name ?? "").slice(0, 120);
    }
    return { videos, tone: String(input.tone ?? "").slice(0, 40), brief: String(input.brief ?? "").slice(0, 500) };
  })
  .handler(async ({ data }) => {
    const { generateResponse } = await import("@lovable.dev/ai-gateway");
    type Part = { type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "low" };
    const content: Part[] = [
      { type: "input_text", text: `Tom desejado: ${data.tone || "livre"}. Tema/nicho: ${data.brief || "deduza pelos vídeos"}. Total: ${data.videos.length} vídeos.` },
    ];
    data.videos.forEach((v, i) => {
      content.push({ type: "input_text", text: `Vídeo ${i + 1} (${v.name}):` });
      for (const f of v.frames) content.push({ type: "input_image", image_url: f, detail: "low" });
    });
    const res = await generateResponse({
      model: "openai/gpt-6.1-sol",
      reasoning: { effort: "low" },
      instructions:
        "Você é copywriter de Reels/TikTok em português do Brasil. Para CADA vídeo, na ordem, olhe os quadros dos primeiros segundos e escreva UMA headline de gancho de alta retenção, com no máximo 10 palavras, que combine com o que aparece no vídeo. Sem hashtags, sem emojis, sem aspas. Headlines diferentes entre si.",
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "headlines",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["headlines"],
            properties: { headlines: { type: "array", items: { type: "string" } } },
          },
        },
      },
    });
    const raw = (res as { output_text?: string }).output_text || extractText(res);
    try {
      const list = (JSON.parse(raw) as { headlines: string[] }).headlines
        .map((h) => h.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, data.videos.length);
      if (!list.length) throw new Error();
      return { headlines: list };
    } catch {
      throw new Error("A IA não retornou headlines válidas. Tente novamente.");
    }
  });

function extractText(res: unknown): string {
  const out = (res as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }).output ?? [];
  for (const item of out) for (const c of item.content ?? []) if (c.type === "output_text" && c.text) return c.text;
  return "";
}
