import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Mic, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/lib/editor/store";
import { useAI, aiReady } from "@/lib/ai/settings";
import { generateTitles, transcribeAudio } from "@/lib/ai/client";

export function AITitleTools() {
  const hydrate = useAI((s) => s.hydrate);
  const hydrated = useAI((s) => s.hydrated);
  const config = useAI((s) => s.config);

  const items = useEditor((s) => s.items);
  const selectedId = useEditor((s) => s.selectedId);
  const updateGlobalTitle = useEditor((s) => s.updateGlobalTitle);
  const globalTitle = useEditor((s) => s.globalTitle);
  const setOverride = useEditor((s) => s.setTitleOverride);

  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState<"titles" | "stt" | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const item = items.find((i) => i.id === selectedId) ?? null;
  const ready = hydrated && aiReady(config);

  if (!hydrated) return null;

  if (!ready) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-[11px] text-muted-foreground">
        <div className="mb-1 flex items-center gap-1 font-medium text-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> IA desativada
        </div>
        Configure uma API externa no{" "}
        <Link to="/admin" className="text-primary underline">
          painel administrativo
        </Link>{" "}
        para gerar títulos e transcrever áudio.
      </div>
    );
  }

  const runTitles = async () => {
    if (!brief.trim()) return toast.error("Descreva o tema dos vídeos");
    setBusy("titles");
    try {
      const count = Math.max(1, items.length || 3);
      const titles = await generateTitles(config, brief.trim(), count);
      if (titles.length === 0) throw new Error("A IA não retornou títulos");
      updateGlobalTitle({ lines: titles.join("\n"), enabled: true });
      toast.success(`${titles.length} título(s) gerado(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar títulos");
    } finally {
      setBusy(null);
    }
  };

  const runTranscribe = async () => {
    if (!item) return;
    setBusy("stt");
    try {
      const { extractAudio } = await import("@/lib/editor/ffmpeg");
      toast.info("Extraindo áudio do vídeo…");
      const audio = await extractAudio(item.file);
      const text = await transcribeAudio(config, audio);
      if (!text) throw new Error("Transcrição vazia");
      setOverride(item.id, text.slice(0, 300));
      toast.success("Transcrição aplicada ao título deste vídeo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na transcrição");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-semibold">
          <Sparkles className="h-3 w-3 text-primary" /> Assistente de IA
        </div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-3 w-3" /> Configurar
        </Link>
      </div>

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={2}
        placeholder="Tema dos vídeos (ex: dicas de treino em casa, tom provocativo)"
        className="mb-2 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-xs"
      />

      <div className="flex flex-col gap-2">
        <button
          onClick={runTitles}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy === "titles" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Gerar {Math.max(1, items.length || 3)} título(s)
        </button>

        <button
          onClick={runTranscribe}
          disabled={busy !== null || !item}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border py-2 text-xs font-medium hover:bg-surface-2 disabled:opacity-40"
        >
          {busy === "stt" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Mic className="h-3 w-3" />
          )}
          Transcrever áudio do vídeo selecionado
        </button>
      </div>

      {globalTitle.lines.trim().length > 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Os títulos gerados substituem a lista abaixo.
        </p>
      )}
    </div>
  );
}
