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
  const setOverride = useEditor((s) => s.setTitleOverride);
  const select = useEditor((s) => s.select);
  const selectedId = useEditor((s) => s.selectedId);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  /** Line 1 → video 1, line 2 → video 2… each one stored on its own video. */
  const distribute = (list: string[]) => {
    items.forEach((it, i) => setOverride(it.id, list[i] ?? ""));
    update({ enabled: true, lines: "" });
  };
  const run = useServerFn(suggestHeadlines);
  const [tone, setTone] = useState<string>(HEADLINE_TONES[0]);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filled = items.filter((i) => i.titleOverride?.trim()).length;
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
      distribute(headlines);
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
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Adicione vídeos ao lote para escrever as headlines.</p>
      ) : (
        <ol className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
          {items.map((it, i) => (
            <li key={it.id} className={`rounded-md border p-1.5 ${selectedId === it.id ? "border-primary bg-primary/5" : "border-border"}`}>
              <button type="button" onClick={() => select(it.id)} className="mb-1 flex w-full items-center gap-1.5 text-left text-[10px] text-muted-foreground">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-primary/15 font-bold text-primary">{i + 1}</span>
                <span className="truncate">{it.name}</span>
              </button>
              <input
                value={it.titleOverride ?? ""}
                onFocus={() => select(it.id)}
                onChange={(e) => { setOverride(it.id, e.target.value); if (!title.enabled) update({ enabled: true }); }}
                placeholder={`Headline do vídeo ${i + 1}`}
                className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
              />
            </li>
          ))}
        </ol>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">{filled} de {items.length} vídeo(s) com headline</p>

      <button type="button" onClick={() => setShowPaste((v) => !v)} className="mt-2 text-[11px] font-semibold text-primary">
        {showPaste ? "Fechar lista" : "Colar lista de linhas"}
      </button>
      {showPaste && (
        <div className="mt-1">
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4}
            placeholder={"Linha 1 → vídeo 1\nLinha 2 → vídeo 2"}
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-xs" />
          <button type="button" disabled={!items.length}
            onClick={() => { distribute(paste.split("\n").map((l) => l.trim()).filter(Boolean)); setShowPaste(false); setPaste(""); toast.success("Headlines distribuídas nos vídeos"); }}
            className="mt-1 w-full rounded-md border border-primary/50 py-1.5 text-xs font-semibold text-primary disabled:opacity-50">
            Distribuir nos vídeos
          </button>
        </div>
      )}

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
