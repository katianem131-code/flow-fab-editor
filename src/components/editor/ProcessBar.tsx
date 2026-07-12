import { useState } from "react";
import { Play, Package, Loader2 } from "lucide-react";
import { useEditor, effectiveBorders, titleTextForItem } from "@/lib/editor/store";
import { toast } from "sonner";
import { downloadBlob, zipBlobs } from "@/lib/editor/zip";

export function ProcessBar() {
  const items = useEditor((s) => s.items);
  const globalBorders = useEditor((s) => s.globalBorders);
  const globalTitle = useEditor((s) => s.globalTitle);
  const globalLower = useEditor((s) => s.globalLower);
  const engineLoading = useEditor((s) => s.engineLoading);
  const setEngine = useEditor((s) => s.setEngine);
  const setItemStatus = useEditor((s) => s.setItemStatus);
  const setItemProgress = useEditor((s) => s.setItemProgress);
  const setItemOutput = useEditor((s) => s.setItemOutput);

  const [running, setRunning] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [zipping, setZipping] = useState(false);

  const readyCount = items.filter((i) => i.status === "done").length;
  const outputs = items.filter((i) => i.outputUrl);
  const canProcess = items.length > 0 && !running;

  const runAll = async () => {
    if (!canProcess) return;
    setRunning(true);
    setGlobalProgress(0);
    setEngine({ engineLoading: true, engineError: null });
    try {
      const { getFFmpeg, processVideo } = await import("@/lib/editor/ffmpeg");
      await getFFmpeg();
      setEngine({ engineLoading: false, engineReady: true });

      const pending = items.filter((i) => i.status !== "done");
      for (let idx = 0; idx < pending.length; idx++) {
        const it = pending[idx];
        setItemStatus(it.id, "processing", { progress: 0 });
        try {
          const originalIndex = items.findIndex((x) => x.id === it.id);
          const blob = await processVideo(it.file, {
            borders: effectiveBorders(it, globalBorders),
            title: globalTitle.enabled
              ? { settings: globalTitle, text: titleTextForItem(it, originalIndex, globalTitle) }
              : undefined,
            lower: globalLower.enabled
              ? { settings: globalLower, text: globalLower.text }
              : undefined,
            onProgress: (p) => {
              setItemProgress(it.id, p);
              setGlobalProgress((idx + p) / pending.length);
            },
          });
          const outName = it.name.replace(/\.[^.]+$/, "") + "_labremix.mp4";
          setItemOutput(it.id, blob, outName);
        } catch (err) {
          console.error(err);
          setItemStatus(it.id, "error", {
            error: err instanceof Error ? err.message : "Falha",
          });
        }
        setGlobalProgress((idx + 1) / pending.length);
      }
      toast.success("Processamento concluído");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro ao carregar engine";
      setEngine({ engineLoading: false, engineError: msg });
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  const downloadAll = async () => {
    if (outputs.length === 0) return;
    setZipping(true);
    try {
      const entries = await Promise.all(
        outputs.map(async (i) => ({
          name: i.outputName ?? i.name,
          blob: await fetch(i.outputUrl!).then((r) => r.blob()),
        })),
      );
      const zip = await zipBlobs(entries);
      downloadBlob(zip, "labremix.zip");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="border-t border-border bg-surface/60 p-3 backdrop-blur">
      {running && (
        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{engineLoading ? "Carregando engine de vídeo…" : `Processando ${Math.round(globalProgress * 100)}%`}</span>
            <span>{readyCount}/{items.length}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round(globalProgress * 100)}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={runAll}
          disabled={!canProcess}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Processar {items.length} vídeo{items.length === 1 ? "" : "s"}
        </button>
        {outputs.length > 0 && (
          <button
            onClick={downloadAll}
            disabled={zipping}
            className="inline-flex items-center gap-1 rounded-md bg-[color:var(--success)] px-3 text-xs font-semibold text-[color:var(--success-foreground)] hover:opacity-90 disabled:opacity-60"
          >
            {zipping ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Package className="h-3 w-3" />
            )}
            Baixar .zip ({outputs.length})
          </button>
        )}
      </div>
    </div>
  );
}
