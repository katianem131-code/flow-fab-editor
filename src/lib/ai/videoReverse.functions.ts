import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ReverseShot {
  start: number;
  end: number;
  type: string;
  description: string;
  framing: string;
  lighting: string;
  overlayText: string;
  prompt: string;
}

export interface VideoReverse {
  summary: string;
  hook: { seconds: string; analysis: string; why: string };
  shots: ReverseShot[];
  audio: string;
  editing: string;
  adaptedScript: string;
  steps: string[];
}

const MAX_FRAMES = 16;
const MAX_FRAME = 400_000;

export const reverseVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { frames: { t: number; image: string }[]; duration: number; context?: string }) => {
    const frames = Array.isArray(input?.frames) ? input.frames.slice(0, MAX_FRAMES) : [];
    if (!frames.length) throw new Error("Nenhum quadro do vídeo.");
    for (const f of frames) {
      if (typeof f?.image !== "string" || !f.image.startsWith("data:image/") || f.image.length > MAX_FRAME)
        throw new Error("Quadro inválido.");
      if (typeof f.t !== "number" || !Number.isFinite(f.t)) throw new Error("Tempo inválido.");
    }
    const duration = Number(input.duration);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 900) throw new Error("Duração inválida.");
    return { frames, duration, context: String(input.context ?? "").slice(0, 2000) };
  })
  .handler(async ({ data }): Promise<VideoReverse> => {
    const { generateResponse } = await import("@lovable.dev/ai-gateway");
    const content: ({ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "low" })[] = [
      { type: "input_text", text: `Duração total: ${data.duration.toFixed(1)}s. Contexto/legenda: ${data.context || "não informado"}` },
    ];
    for (const f of data.frames) {
      content.push({ type: "input_text", text: `Quadro em ${f.t.toFixed(1)}s:` });
      content.push({ type: "input_image", image_url: f.image, detail: "low" });
    }
    const str = { type: "string" } as const;
    const res = await generateResponse({
      model: "openai/gpt-6.1-sol",
      reasoning: { effort: "low" },
      instructions:
        "Você faz engenharia reversa de vídeos curtos (Reels/TikTok/Shorts) em português do Brasil, quadro a quadro. Com base nos quadros com tempo, agrupe em cenas (shots) com início/fim em segundos; classifique cada uma como: filmagem real, gerado por IA, 3D, animação 2D, gravação de tela, template/código, imagem estática ou misto. Descreva enquadramento, movimento de câmera, iluminação, textos/legendas sobrepostos e, para cada cena, escreva um prompt em inglês pronto para recriá-la num gerador de vídeo (ou instruções de filmagem se for filmagem real). Analise o gancho dos primeiros 3 segundos e por que prende atenção. Inferências de áudio/edição devem ser indicadas como prováveis, já que você vê apenas quadros. Escreva um roteiro adaptado para modelar o vídeo e passos de replicação.",
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "video_reverse",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "hook", "shots", "audio", "editing", "adaptedScript", "steps"],
            properties: {
              summary: str,
              hook: {
                type: "object", additionalProperties: false, required: ["seconds", "analysis", "why"],
                properties: { seconds: str, analysis: str, why: str },
              },
              shots: {
                type: "array",
                items: {
                  type: "object", additionalProperties: false,
                  required: ["start", "end", "type", "description", "framing", "lighting", "overlayText", "prompt"],
                  properties: {
                    start: { type: "number" }, end: { type: "number" }, type: str, description: str,
                    framing: str, lighting: str, overlayText: str, prompt: str,
                  },
                },
              },
              audio: str,
              editing: str,
              adaptedScript: str,
              steps: { type: "array", items: str },
            },
          },
        },
      },
    });
    const raw = (res as { output_text?: string }).output_text ?? extractText(res);
    try {
      return JSON.parse(raw) as VideoReverse;
    } catch {
      throw new Error("A IA não retornou uma análise válida. Tente novamente.");
    }
  });

function extractText(res: unknown): string {
  const output = (res as { output?: { content?: { type: string; text?: string }[] }[] }).output ?? [];
  for (const item of output)
    for (const c of item.content ?? []) if (c.type === "output_text" && c.text) return c.text;
  return "";
}
