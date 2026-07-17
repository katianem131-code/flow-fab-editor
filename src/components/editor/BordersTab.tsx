import { useEditor, effectiveBorders } from "@/lib/editor/store";
import { AspectRatio, BorderSettings, DEFAULT_BORDERS } from "@/lib/editor/types";
import { RotateCcw } from "lucide-react";

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Bordas</h3>
          <p className="text-[10px] text-muted-foreground">
            Ajuste zoom, posição e proporção
          </p>
        </div>
        <button
          onClick={resetLocal}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
        >
          <RotateCcw className="h-3 w-3" /> Padrão
        </button>
      </div>

      <Slider label="Zoom" value={b.zoom} min={50} max={200} suffix="%" onChange={(v) => patch({ zoom: v })} />
      <Slider label="Posição vertical" value={b.posY} min={0} max={100} suffix="%" onChange={(v) => patch({ posY: v })} />
      <Slider label="Posição horizontal" value={b.posX} min={0} max={100} suffix="%" onChange={(v) => patch({ posX: v })} />

      <div className="mt-2 border-t border-border pt-3">
        <div className="mb-2 text-xs font-medium">Bordas independentes</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <Slider label="Superior" value={b.borderTop ?? 0} min={0} max={45} suffix="%" onChange={(v) => patch({ borderTop: v })} />
          <Slider label="Inferior" value={b.borderBottom ?? 0} min={0} max={45} suffix="%" onChange={(v) => patch({ borderBottom: v })} />
          <Slider label="Esquerda" value={b.borderLeft ?? 0} min={0} max={45} suffix="%" onChange={(v) => patch({ borderLeft: v })} />
          <Slider label="Direita" value={b.borderRight ?? 0} min={0} max={45} suffix="%" onChange={(v) => patch({ borderRight: v })} />
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <div className="mb-2 text-xs font-medium">Esticar vídeo (deforma)</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <Slider label="Largura" value={b.stretchX ?? 100} min={30} max={300} suffix="%" onChange={(v) => patch({ stretchX: v })} />
          <Slider label="Altura" value={b.stretchY ?? 100} min={30} max={300} suffix="%" onChange={(v) => patch({ stretchY: v })} />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          100% mantém proporção. Valores diferentes esticam apenas em uma direção.
        </p>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium">Proporção de saída</div>
        <div className="grid grid-cols-4 gap-1">
          {ASPECTS.map((a) => (
            <button
              key={a.v}
              onClick={() => patch({ aspect: a.v })}
              className={`rounded-md border px-2 py-1.5 text-xs transition ${
                b.aspect === a.v
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface hover:bg-surface-2"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium">Cor da borda</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={b.color}
            onChange={(e) => patch({ color: e.target.value })}
            className="h-9 w-14 cursor-pointer rounded border border-border bg-surface"
          />
          <input
            type="text"
            value={b.color}
            onChange={(e) => patch({ color: e.target.value })}
            className="flex-1 rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs"
          />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Ajusta zoom e posição do vídeo em todas as abas de edição.
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
