import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Clapperboard, Copy, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { reverseVideo, type VideoReverse } from "@/lib/ai/videoReverse.functions";
import { extractFrames } from "@/lib/ai/extractFrames";

interface Props { videos: { id: string; name: string; file: File }[]; context: string }

const fmt = (s: number) => `${s.toFixed(1)}s`;

function toMarkdown(name: string, r: VideoReverse) {
  return [
    `# Engenharia reversa — ${name}`, "", r.summary, "",
    `## Gancho (${r.hook.seconds})`, r.hook.analysis, "", `Por que funciona: ${r.hook.why}`, "",
    "## Cenas",
    ...r.shots.map((s, i) => `### ${i + 1}. ${fmt(s.start)}–${fmt(s.end)} · ${s.type}\n${s.description}\n- Enquadramento: ${s.framing}\n- Luz: ${s.lighting}\n- Texto na tela: ${s.overlayText || "—"}\n- Prompt: ${s.prompt}\n`),
    "## Áudio", r.audio, "", "## Edição", r.editing, "", "## Roteiro adaptado", r.adaptedScript, "",
    "## Passos para replicar", ...r.steps.map((s, i) => `${i + 1}. ${s}`),
  ].join("\n");
}

export function VideoReversePanel({ videos, context }: Props) {
  const run = useServerFn(reverseVideo);
  const [selected, setSelected] = useState(videos[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<VideoReverse | null>(null);
  const video = videos.find((v) => v.id === selected) ?? videos[0];

  const analyze = async () => {
    if (!video) return;
    setResult(null);
    try {
      setBusy("Lendo quadros do vídeo…");
      const { frames, duration } = await extractFrames(video.file);
      setBusy("A IA está desmontando as cenas…");
      setResult(await run({ data: { frames, duration, context } }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(/auth|401|unauthor/i.test(msg) ? "Entre na sua conta para usar a IA." : msg || "Falha na análise.");
    } finally {
      setBusy(null);
    }
  };

  const copy = (t: string) => { void navigator.clipboard.writeText(t); toast.success("Copiado"); };
  const download = () => {
    if (!result || !video) return;
    const blob = new Blob([toMarkdown(video.name, result)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${video.name.replace(/\.[^.]+$/, "")}-engenharia-reversa.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mt-6 rounded-xl border border-primary/40 bg-surface/30 p-4 sm:p-6">
      <div className="flex items-center gap-2 font-semibold text-primary"><Clapperboard className="h-5 w-5" /> Engenharia reversa de vídeo</div>
      <p className="mt-1 text-xs text-muted-foreground">A IA desmonta o vídeo cena a cena: gancho, tipo de cada take, enquadramento, textos e prompts para recriar.</p>
      {videos.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Este lote não tem vídeos disponíveis.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <select value={video?.id} onChange={(e) => { setSelected(e.target.value); setResult(null); }}
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs">
            {videos.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button onClick={analyze} disabled={!!busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {busy ?? "Analisar vídeo"}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-4 text-xs">
          <div className="flex justify-end">
            <button onClick={download} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:border-primary"><Download className="h-3 w-3" /> Baixar relatório</button>
          </div>
          <p className="leading-relaxed">{result.summary}</p>
          <section className="rounded-lg border border-border bg-background p-3">
            <h3 className="font-semibold text-primary">Gancho ({result.hook.seconds})</h3>
            <p className="mt-1 leading-relaxed">{result.hook.analysis}</p>
            <p className="mt-1 text-muted-foreground">Por que funciona: {result.hook.why}</p>
          </section>
          <section>
            <h3 className="mb-2 font-semibold">Cenas ({result.shots.length})</h3>
            <ol className="space-y-2">
              {result.shots.map((s, i) => (
                <li key={i} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-muted-foreground">{fmt(s.start)}–{fmt(s.end)}</span>
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{s.type}</span>
                  </div>
                  <p className="mt-1.5 leading-relaxed">{s.description}</p>
                  <p className="mt-1 text-muted-foreground">Enquadramento: {s.framing} · Luz: {s.lighting}</p>
                  {s.overlayText && <p className="mt-1 text-muted-foreground">Texto na tela: {s.overlayText}</p>}
                  <div className="mt-2 rounded-md bg-surface p-2 font-mono text-[11px] leading-relaxed">
                    {s.prompt}
                    <button onClick={() => copy(s.prompt)} className="ml-2 inline-flex items-center gap-1 text-primary"><Copy className="h-3 w-3" /> Copiar</button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-3"><h3 className="font-semibold">Áudio (provável)</h3><p className="mt-1 leading-relaxed">{result.audio}</p></div>
            <div className="rounded-lg border border-border bg-background p-3"><h3 className="font-semibold">Edição</h3><p className="mt-1 leading-relaxed">{result.editing}</p></div>
          </section>
          <section className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Roteiro adaptado</h3>
              <button onClick={() => copy(result.adaptedScript)} className="inline-flex items-center gap-1 text-primary"><Copy className="h-3 w-3" /> Copiar</button></div>
            <p className="mt-1 whitespace-pre-line leading-relaxed">{result.adaptedScript}</p>
          </section>
          <section className="rounded-lg border border-border bg-background p-3">
            <h3 className="font-semibold">Passos para replicar</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-4">{result.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </section>
        </div>
      )}
    </div>
  );
}
