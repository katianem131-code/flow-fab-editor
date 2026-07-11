import { useRef } from "react";
import { Upload, Trash2, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { MAX_VIDEOS, MAX_SIZE_MB } from "@/lib/editor/types";

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

export function VideoQueue() {
  const items = useEditor((s) => s.items);
  const selectedId = useEditor((s) => s.selectedId);
  const addFiles = useEditor((s) => s.addFiles);
  const removeItem = useEditor((s) => s.removeItem);
  const clearAll = useEditor((s) => s.clearAll);
  const select = useEditor((s) => s.select);
  const inputRef = useRef<HTMLInputElement>(null);

  const readyCount = items.filter((i) => i.status === "done").length;

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) return false;
      return /\.(mp4|mov|webm)$/i.test(f.name) || f.type.startsWith("video/");
    });
    addFiles(arr);
  };

  return (
    <aside className="flex h-full w-full flex-col gap-3 overflow-hidden p-4">
      <div>
        <h2 className="text-base font-semibold">Editor em lote</h2>
        <p className="text-[11px] text-muted-foreground">
          Até {MAX_VIDEOS} vídeos · {MAX_SIZE_MB}MB · 180s cada
        </p>
      </div>

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-surface p-6 text-center transition hover:border-primary/60 hover:bg-surface-2"
      >
        <Upload className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">Arraste vídeos ou clique</span>
        <span className="text-[10px] text-muted-foreground">MP4, MOV, WebM</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </label>

      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-muted-foreground">
          {items.length} vídeo{items.length === 1 ? "" : "s"} · {readyCount} pronto{readyCount === 1 ? "" : "s"}
        </span>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" /> Limpar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <ul className="flex flex-col gap-2">
          {items.map((i) => {
            const selected = i.id === selectedId;
            return (
              <li
                key={i.id}
                onClick={() => select(i.id)}
                className={`group cursor-pointer rounded-lg border p-2 transition ${
                  selected
                    ? "border-primary bg-surface-2"
                    : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center gap-2">
                  <video
                    src={i.previewUrl}
                    className="h-10 w-10 shrink-0 rounded object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-xs font-medium">{i.name}</p>
                      {i.borders && (
                        <span className="rounded bg-primary/20 px-1 text-[9px] font-semibold text-primary">
                          PERSONALIZADO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>{i.sizeMB.toFixed(1)} MB</span>
                      <span>·</span>
                      <StatusBadge item={i} />
                    </div>
                    {i.status === "processing" && (
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.round(i.progress * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(i.id);
                    }}
                    className="opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

function StatusBadge({ item }: { item: ReturnType<typeof useEditor.getState>["items"][number] }) {
  switch (item.status) {
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 text-primary">
          <Loader2 className="h-3 w-3 animate-spin" /> editando agora
        </span>
      );
    case "done":
      return (
        <span className="inline-flex items-center gap-1 text-[color:var(--success)]">
          <CheckCircle2 className="h-3 w-3" /> pronto
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 text-destructive">
          <AlertCircle className="h-3 w-3" /> erro
        </span>
      );
    default:
      return <span>aguardando</span>;
  }
}
