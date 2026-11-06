import { useRef } from "react";
import { FolderOpen, Film, CheckCircle2, Loader2, AlertCircle, Trash2, Plus, Download } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { downloadBlob } from "@/lib/editor/zip";

export function BatchMaterialsBar() {
  const items = useEditor((s) => s.items);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const removeItem = useEditor((s) => s.removeItem);
  const addFiles = useEditor((s) => s.addFiles);
  const batchName = useEditor((s) => s.batchName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readyCount = items.filter((i) => i.status === "done").length;

  const onAddFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(
      (f) => /\.(mp4|mov|webm)$/i.test(f.name) || f.type.startsWith("video/"),
    );
    if (arr.length) addFiles(arr);
  };

  return (
    <div className="border-t border-border bg-surface/30 backdrop-blur">
      {/* Cabeçalho da Barra de Materiais */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 truncate">
          <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground">Materiais do Lote</span>
          {batchName ? (
            <span className="font-mono text-[11px] text-muted-foreground truncate" title={batchName}>
              ({batchName})
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">({items.length} vídeos)</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>
            <strong className="text-foreground">{items.length}</strong> vídeo(s) no lote
          </span>
          <span>·</span>
          <span className="font-medium text-emerald-400">
            <strong>{readyCount}</strong> pronto(s)
          </span>
        </div>
      </div>

      {/* Relação de Materiais (Fita Horizontal / Carrossel) */}
      <div className="flex items-center gap-2.5 overflow-x-auto p-3 scrollbar-thin">
        {items.map((it, idx) => {
          const isSelected = it.id === selectedId;

          return (
            <div
              key={it.id}
              onClick={() => select(it.id)}
              className={`group relative flex w-[230px] shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border p-2 transition ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                  : "border-border bg-background/80 hover:border-primary/50 hover:bg-surface/60"
              }`}
            >
              {/* Miniatura do Vídeo */}
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-black/50">
                <video
                  src={it.previewUrl}
                  className="h-full w-full object-cover"
                  muted
                  preload="metadata"
                />
                {it.status === "done" && (
                  <span className="absolute bottom-0.5 right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                )}
                {it.status === "processing" && (
                  <span className="absolute inset-0 grid place-items-center bg-black/60 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                )}
                {it.status === "error" && (
                  <span className="absolute bottom-0.5 right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-destructive text-white">
                    <AlertCircle className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* Informações do Arquivo */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                  <p className="truncate text-xs font-medium text-foreground" title={it.name}>
                    {it.name}
                  </p>
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                  {it.status === "done" ? (
                    <span className="font-semibold text-emerald-400">Pronto</span>
                  ) : it.status === "processing" ? (
                    <span className="font-semibold text-primary">
                      {Math.round(it.progress * 100)}%
                    </span>
                  ) : it.status === "error" ? (
                    <span className="font-semibold text-destructive">Falha</span>
                  ) : (
                    <span className="text-muted-foreground">Aguardando</span>
                  )}
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{it.sizeMB.toFixed(1)} MB</span>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="flex flex-col items-center gap-1">
                {it.outputUrl && (
                  <button
                    type="button"
                    aria-label="Baixar este vídeo"
                    title="Baixar este vídeo processado"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetch(it.outputUrl!)
                        .then((r) => r.blob())
                        .then((b) => downloadBlob(b, it.outputName ?? it.name));
                    }}
                    className="p-1 text-emerald-400 hover:text-emerald-300 transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Remover vídeo do lote"
                  title="Remover do lote"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(it.id);
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive transition opacity-60 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Botão de Adicionar Mais Vídeos ao Lote */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-[58px] w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-surface/30 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary transition cursor-pointer"
          title="Adicionar mais vídeos ao lote"
        >
          <Plus className="h-4 w-4" />
          <span className="text-[10px] font-medium">+ Vídeo</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          hidden
          onChange={(e) => onAddFiles(e.target.files)}
        />
      </div>
    </div>
  );
}

