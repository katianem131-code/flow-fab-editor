import { useEffect, useState } from "react";
import { Copy, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { analyzeSlide, generateSlideImage, type SlideAnalysis } from "@/lib/ai/slideAi.functions";
import type { CarouselSlide } from "@/lib/editor/carousel";

async function fileToDataUrl(file: Blob, max = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function errorText(e: unknown) {
  const m = e instanceof Error ? e.message : "";
  if (/401|unauth/i.test(m)) return "Entre na sua conta para usar a IA.";
  if (/402|payment/i.test(m)) return "Créditos de IA esgotados.";
  if (/429|rate/i.test(m)) return "Muitas solicitações. Aguarde um pouco.";
  return m || "Falha na IA. Tente novamente.";
}

interface Props {
  slide: CarouselSlide;
  context: string;
  onApplyText: (text: string, colors?: { text: string; background: string }) => void;
  onReplaceBackground: (file: File) => void;
}

export function SlideAiPanel({ slide, context, onApplyText, onReplaceBackground }: Props) {
  const analyze = useServerFn(analyzeSlide);
  const genImage = useServerFn(generateSlideImage);
  const [results, setResults] = useState<Record<string, SlideAnalysis>>({});
  const [choice, setChoice] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<"analyze" | "image" | null>(null);
  const analysis = results[slide.id];

  useEffect(() => {
    setChoice(results[slide.id]?.originalText ?? "");
    setPrompt(results[slide.id]?.imagePrompt ?? "");
  }, [slide.id, results]);

  const run = async () => {
    setBusy("analyze");
    try {
      const image = await fileToDataUrl(slide.background);
      const r = await analyze({ data: { image, context } });
      setResults((s) => ({ ...s, [slide.id]: r }));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const generate = async () => {
    setBusy("image");
    try {
      const { image } = await genImage({ data: { prompt } });
      const blob = await (await fetch(image)).blob();
      onReplaceBackground(new File([blob], `ia-${Date.now()}.jpg`, { type: "image/jpeg" }));
      toast.success("Novo fundo aplicado ao slide.");
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const options = analysis ? [analysis.originalText, ...analysis.suggestions].filter(Boolean) : [];

  return (
    <section className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Analisar com IA
        </h3>
        <button
          onClick={run}
          disabled={busy !== null}
          className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy === "analyze" && <Loader2 className="h-3 w-3 animate-spin" />}
          {analysis ? "Analisar de novo" : "Analisar este slide"}
        </button>
      </div>
      {!analysis && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          A IA lê a frase, a tipografia e as cores deste slide e cria um prompt para um novo fundo.
        </p>
      )}
      {analysis && (
        <div className="mt-3 space-y-3 text-[11px]">
          <div className="rounded-md bg-background/60 p-2 text-muted-foreground">
            <p><b className="text-foreground">Tipografia:</b> {analysis.typography}</p>
            <p className="mt-1"><b className="text-foreground">Estilo:</b> {analysis.style}</p>
            <p className="mt-1 flex items-center gap-1">
              <b className="text-foreground">Cores:</b>
              <span className="inline-block h-3 w-3 rounded-sm border border-border" style={{ background: analysis.colors.text }} />
              <span className="inline-block h-3 w-3 rounded-sm border border-border" style={{ background: analysis.colors.background }} />
            </p>
          </div>
          <div>
            <p className="mb-1 font-semibold">Frase do slide</p>
            <div className="space-y-1">
              {options.map((opt, i) => (
                <label key={i} className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2">
                  <input type="radio" checked={choice === opt} onChange={() => setChoice(opt)} className="mt-0.5" />
                  <span>
                    <span className="block text-[10px] text-muted-foreground">
                      {i === 0 ? "Manter a mesma frase" : `Sugestão ${i}`}
                    </span>
                    {opt}
                  </span>
                </label>
              ))}
            </div>
            <textarea
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-md border border-border bg-background p-2"
            />
            <button
              onClick={() => onApplyText(choice, analysis.colors)}
              disabled={!choice.trim()}
              className="mt-1 w-full rounded-md border border-primary px-2 py-1.5 font-semibold text-primary disabled:opacity-60"
            >
              Aplicar frase no slide
            </button>
          </div>
          <div>
            <p className="mb-1 flex items-center justify-between font-semibold">
              Prompt do novo fundo
              <button
                onClick={() => { void navigator.clipboard.writeText(prompt); toast.success("Prompt copiado."); }}
                className="flex items-center gap-1 text-muted-foreground"
              >
                <Copy className="h-3 w-3" /> Copiar
              </button>
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-border bg-background p-2"
            />
            <button
              onClick={generate}
              disabled={busy !== null || !prompt.trim()}
              className="mt-1 flex w-full items-center justify-center gap-1 rounded-md bg-primary px-2 py-1.5 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy === "image" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
              {busy === "image" ? "Gerando imagem…" : "Gerar novo fundo com IA"}
            </button>
            <p className="mt-1 text-[10px] text-muted-foreground">Pode levar até 1 minuto. As frases do slide são mantidas.</p>
          </div>
        </div>
      )}
    </section>
  );
}
