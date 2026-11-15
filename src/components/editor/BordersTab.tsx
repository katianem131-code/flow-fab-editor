import { useEditor, effectiveBorders } from "@/lib/editor/store";
import { AspectRatio, BorderSettings, DEFAULT_BORDERS } from "@/lib/editor/types";
import { RotateCcw } from "lucide-react";
import { TemplatesGallery } from "./TemplatesGallery";
import { AntiDupPanel } from "./AntiDupPanel";

const ASPECTS: { v: AspectRatio; label: string }[] = [
  { v: "9:16", label: "9:16" },
  { v: "1:1", label: "1:1" },
  { v: "4:5", label: "4:5" },
  { v: "16:9", label: "16:9" },
];

export function BordersTab() {
  const items = useEditor((s) => s.items);
  const selectedId = useEditor((s) => s.selectedId);
  const editMode = useEditor((s) => s.editMode);
  const globalBorders = useEditor((s) => s.globalBorders);
  const updateGlobal = useEditor((s) => s.updateGlobalBorders);
  const updateItem = useEditor((s) => s.updateItemBorders);

  const item = items.find((i) => i.id === selectedId) ?? null;
  const isSingle = editMode === "single" && !!item;
  const b: BorderSettings = isSingle && item ? effectiveBorders(item, globalBorders) : globalBorders;

  const patch = (p: Partial<BorderSettings>) => {
    if (isSingle && item) updateItem(item.id, p);
    else updateGlobal(p);
  };

  const resetLocal = () => {
    if (isSingle && item) updateItem(item.id, DEFAULT_BORDERS);
    else updateGlobal(DEFAULT_BORDERS);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <TemplatesGallery />
      <AntiDupPanel />
      <p className="rounded-md border border-border bg-surface p-3 text-[11px] text-muted-foreground">
        Bordas, zoom, posição e área de cada vídeo agora são ajustados em <span className="font-medium text-foreground">Editar template</span>. Clique em uma camada (Vídeo 1 ou Vídeo 2) na prévia do template.
      </p>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value.toFixed(0)}
          {suffix ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
