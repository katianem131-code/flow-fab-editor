import { useRef } from "react";
import { Upload, Trash2, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { MAX_VIDEOS, MAX_SIZE_MB, type AspectRatio, type BorderSettings } from "@/lib/editor/types";

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

type ImportPreset = {
  id: string;
  label: string;
  hint: string;
  borders: Partial<BorderSettings> & { aspect: AspectRatio };
};

const IMPORT_PRESETS: ImportPreset[] = [
  {
    id: "reels-white",
    label: "Reels 9:16 · bordas brancas",
    hint: "Vídeo centralizado com faixas brancas em cima e embaixo",
    borders: { aspect: "9:16", zoom: 100, posX: 50, posY: 50, color: "#ffffff" },
  },
  {
    id: "reels-dark",
    label: "Reels 9:16 · bordas escuras",
    hint: "Fundo azul-escuro LabRemix",
    borders: { aspect: "9:16", zoom: 100, posX: 50, posY: 50, color: "#14213D" },
  },
  {
    id: "reels-fill",
    label: "Reels 9:16 · preencher",
    hint: "Sem bordas — corta as laterais",
    borders: { aspect: "9:16", zoom: 175, posX: 50, posY: 50, color: "#000000" },
  },
  {
    id: "square",
    label: "Quadrado 1:1",
    hint: "Feed do Instagram",
    borders: { aspect: "1:1", zoom: 100, posX: 50, posY: 50, color: "#ffffff" },
  },
  {
    id: "portrait-4-5",
    label: "Retrato 4:5",
    hint: "Feed vertical",
    borders: { aspect: "4:5", zoom: 100, posX: 50, posY: 50, color: "#ffffff" },
  },
  {
    id: "landscape",
    label: "Horizontal 16:9",
    hint: "YouTube / TV",
    borders: { aspect: "16:9", zoom: 100, posX: 50, posY: 50, color: "#000000" },
  },
];

export function VideoQueue() {
  const items = useEditor((s) => s.items);
  const selectedId = useEditor((s) => s.selectedId);
  const globalBorders = useEditor((s) => s.globalBorders);
  const addFiles = useEditor((s) => s.addFiles);
  const removeItem = useEditor((s) => s.removeItem);
  const clearAll = useEditor((s) => s.clearAll);
  const select = useEditor((s) => s.select);
  const updateGlobalBorders = useEditor((s) => s.updateGlobalBorders);
  const inputRef = useRef<HTMLInputElement>(null);

  const readyCount = items.filter((i) => i.status === "done").length;

  // Detecta o preset ativo comparando aspect + color + zoom
  const activePresetId =
    IMPORT_PRESETS.find(
      (p) =>
        p.borders.aspect === globalBorders.aspect &&
        p.borders.color?.toLowerCase() === globalBorders.color.toLowerCase() &&
        Math.abs((p.borders.zoom ?? 100) - globalBorders.zoom) < 5,
    )?.id ?? "custom";

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

      <div className="rounded-lg border border-border bg-surface p-2.5">
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Formato ao importar
        </label>
        <select
          value={activePresetId}
          onChange={(e) => {
            const preset = IMPORT_PRESETS.find((p) => p.id === e.target.value);
            if (preset) updateGlobalBorders(preset.borders);
          }}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
        >
          {IMPORT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          {activePresetId === "custom" && (
            <option value="custom">Personalizado</option>
          )}
        </select>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {IMPORT_PRESETS.find((p) => p.id === activePresetId)?.hint ??
            "Ajustes personalizados aplicados manualmente"}
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
