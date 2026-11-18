import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, ListOrdered } from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/lib/editor/store";
import { extractFrames } from "@/lib/ai/extractFrames";
import { suggestHeadlines, HEADLINE_TONES } from "@/lib/ai/headlines.functions";

/** Batch headline list: line 1 → video 1, line 2 → video 2… with an AI filler. */
export function HeadlinesPerVideo() {
  const items = useEditor((s) => s.items);
  const title = useEditor((s) => s.globalTitle);
  const update = useEditor((s) => s.updateGlobalTitle);
  const run = useServerFn(suggestHeadlines);
  const [tone, setTone] = useState<string>(HEADLINE_TONES[0]);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const lines = title.lines.split("\n").map((l) => l.trim()).filter(Boolean);
  const videos = items.slice(0, 20);

  const generate = async () => {
    if (!videos.length) return toast.error("Adicione vídeos ao lote primeiro.");
    try {
      const payload = [];
      for (let i = 0; i < videos.length; i++) {
        setBusy(`Lendo vídeo ${i + 1}/${videos.length}…`);
        const { frames } = await extractFrames(videos[i].file, 3, 384);
        payload.push({ name: videos[i].name, frames: frames.map((f) => f.image) });
      }
      setBusy("A IA está criando as headlines…");
      const { headlines } = await run({ data: { videos: payload, tone, brief } });
      update({ lines: headlines.join("\n"), enabled: true });
      toast.success(`${headlines.length} headline(s) criada(s)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(/auth|401|unauthor/i.test(msg) ? "Entre na sua conta para usar a IA." : msg || "Falha ao gerar headlines.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
        <ListOrdered className="h-3.5 w-3.5 text-primary" /> Headline por vídeo
      </div>
      <p className="mb-2 text-[11px] text-muted-foreground">Uma linha para cada vídeo: a linha 1 vai no vídeo 1, a linha 2 no vídeo 2, e assim por diante.</p>
      <textarea
        value={title.lines}
        onChange={(e) => update({ lines: e.target.value, enabled: true })}
        rows={5}
        placeholder={"3 erros que destroem seu alcance\nPor que ninguém compra de você?"}
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-xs"
      />
      <p className="mt-1 text-[10px] text-muted-foreground">
        {lines.length} headline(s) para {items.length} vídeo(s){lines.length && lines.length < items.length ? " — as frases se repetem em ordem" : ""}
      </p>

      <div className="mt-3 border-t border-border pt-3">
        <div className="mb-2 flex items-center gap-1 text-[11px] font-semibold"><Sparkles className="h-3 w-3 text-primary" /> Preencher com IA (lê o início de cada vídeo)</div>
        <div className="mb-2 flex flex-wrap gap-1">
          {HEADLINE_TONES.map((t) => (
            <button key={t} onClick={() => setTone(t)}
              className={`rounded-full border px-2 py-0.5 text-[10px] ${tone === t ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <input value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Tema ou nicho (opcional)"
          className="mb-2 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs" />
        <button onClick={generate} disabled={!!busy || !videos.length}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {busy ?? `Gerar ${videos.length || ""} headline(s) com IA`}
        </button>
        {items.length > 20 && <p className="mt-1 text-[10px] text-muted-foreground">A IA preenche os 20 primeiros vídeos por vez.</p>}
      </div>
    </div>
  );
}
