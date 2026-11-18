import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SlideAnalysis {
  originalText: string;
  suggestions: string[];
  typography: string;
  colors: { text: string; background: string };
  style: string;
  imagePrompt: string;
}

const MAX_IMAGE = 6_000_000;

export const analyzeSlide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { image: string; context?: string }) => {
    if (typeof input?.image !== "string" || !input.image.startsWith("data:image/"))
      throw new Error("Imagem inválida.");
    if (input.image.length > MAX_IMAGE) throw new Error("Imagem muito grande.");
    return { image: input.image, context: String(input.context ?? "").slice(0, 1000) };
  })
  .handler(async ({ data }): Promise<SlideAnalysis> => {
    const { generateResponse } = await import("@lovable.dev/ai-gateway");
    const res = await generateResponse({
      model: "openai/gpt-6.1-sol",
      instructions:
        "Você analisa slides de carrossel do Instagram em português do Brasil. Leia exatamente a frase escrita na imagem, descreva tipografia/caligrafia (família aparente, peso, caixa, estilo), cores do texto e da tarja/fundo em hex, o estilo visual, sugira 3 frases alternativas de mesmo tamanho e intenção, e escreva um prompt em inglês para gerar uma NOVA imagem de fundo semelhante em estilo, SEM nenhum texto, letras ou marca d'água, deixando espaço livre para a frase.",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: `Contexto do carrossel: ${data.context || "não informado"}` },
            { type: "input_image", image_url: data.image, detail: "auto" },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "slide_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["originalText", "suggestions", "typography", "colors", "style", "imagePrompt"],
            properties: {
              originalText: { type: "string" },
              suggestions: { type: "array", items: { type: "string" } },
              typography: { type: "string" },
              colors: {
                type: "object",
                additionalProperties: false,
                required: ["text", "background"],
                properties: { text: { type: "string" }, background: { type: "string" } },
              },
              style: { type: "string" },
              imagePrompt: { type: "string" },
            },
          },
        },
      },
    });
    const raw = (res as { output_text?: string }).output_text ?? extractText(res);
    try {
      const parsed = JSON.parse(raw) as SlideAnalysis;
      parsed.suggestions = (parsed.suggestions ?? []).slice(0, 3);
      return parsed;
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

export const generateSlideImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string }) => {
    const prompt = String(input?.prompt ?? "").trim().slice(0, 3000);
    if (!prompt) throw new Error("Prompt vazio.");
    return { prompt };
  })
  .handler(async ({ data }) => {
    const { generateImage } = await import("@lovable.dev/ai-gateway");
    const res = await generateImage({
      model: "openai/gpt-image-2.5-sunburst",
      prompt: `${data.prompt}\n\nNo text, no letters, no logos, no watermark.`,
      size: "1024x1536",
      quality: "medium",
      output_format: "jpeg",
    });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error("A IA não retornou imagem.");
    return { image: `data:image/jpeg;base64,${b64}` };
  });
