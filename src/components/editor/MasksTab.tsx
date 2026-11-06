import { useEffect } from "react";
import { useMasks, type MaskMode } from "@/lib/editor/masks";
import { Trash2 } from "lucide-react";

const MODES: { id: MaskMode; label: string }[] = [
  { id: "blur", label: "Borrar" },
  { id: "solid", label: "Cor sólida" },
  { id: "gradient", label: "Tarja suave" },
];

export function MasksTab() {
  const { masks, selected, enabled, hydrate, setEnabled, add, update, remove, select } = useMasks();
  useEffect(() => hydrate(), [hydrate]);
  const m = masks.find((x) => x.id === selected);

  return (
    <div className="space-y-4 p-3 text-xs">
      <label className="flex items-center justify-between">
        <span className="font-medium">Máscaras / Cobertura</span>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      </label>
      <p className="text-[10px] text-muted-foreground">
        Cubra logos, marcas d'água ou legendas. Arraste a caixa no preview. Vale para todos os vídeos do lote.
      </p>
      <div className="grid grid-cols-3 gap-1">
        <button className="rounded-md border border-border bg-surface px-2 py-1.5 hover:bg-surface-2" onClick={() => add("solid", { x: 0, y: 82, w: 100, h: 12 })}>Legenda</button>
        <button className="rounded-md border border-border bg-surface px-2 py-1.5 hover:bg-surface-2" onClick={() => add("blur", { x: 65, y: 3, w: 30, h: 7 })}>Logo topo</button>
        <button className="rounded-md border border-border bg-surface px-2 py-1.5 hover:bg-surface-2" onClick={() => add("blur", { x: 35, y: 45, w: 30, h: 10 })}>Livre</button>
      </div>

      {masks.length > 0 && (
        <div className="space-y-1">
          {masks.map((x, i) => (
            <div key={x.id} onClick={() => select(x.id)} className={`flex cursor-pointer items-center justify-between rounded-md border px-2 py-1.5 ${x.id === selected ? "border-primary" : "border-border"}`}>
              <span>Máscara {i + 1} · {MODES.find((mm) => mm.id === x.mode)?.label}</span>
              <button onClick={(e) => { e.stopPropagation(); remove(x.id); }}><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}

      {m && (
        <div className="space-y-3 rounded-md border border-border p-2">
          <div className="grid grid-cols-3 gap-1">
            {MODES.map((mo) => (
              <button key={mo.id} onClick={() => update(m.id, { mode: mo.id })} className={`rounded px-2 py-1 ${m.mode === mo.id ? "bg-primary text-primary-foreground" : "bg-surface"}`}>{mo.label}</button>
            ))}
          </div>
          {(["x", "y", "w", "h"] as const).map((k) => (
            <label key={k} className="block">
              <span className="text-muted-foreground">{{ x: "Horizontal", y: "Vertical", w: "Largura", h: "Altura" }[k]}: {Math.round(m[k])}%</span>
              <input type="range" min={k === "w" || k === "h" ? 2 : 0} max={100} value={m[k]} onChange={(e) => update(m.id, { [k]: +e.target.value })} className="w-full" />
            </label>
          ))}
          {m.mode === "blur" ? (
            <label className="block">
              <span className="text-muted-foreground">Intensidade: {m.blur}</span>
              <input type="range" min={2} max={30} value={m.blur} onChange={(e) => update(m.id, { blur: +e.target.value })} className="w-full" />
            </label>
          ) : (
            <label className="flex items-center justify-between">
              <span className="text-muted-foreground">Cor</span>
              <input type="color" value={m.color} onChange={(e) => update(m.id, { color: e.target.value })} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export function MaskPreviewLayer() {
  const { masks, enabled, selected, update, select } = useMasks();
  if (!enabled) return null;
  const startDrag = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const mm = masks.find((x) => x.id === id)!;
    const sx = e.clientX, sy = e.clientY;
    select(id);
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / parent.width) * 100;
      const dy = ((ev.clientY - sy) / parent.height) * 100;
      update(id, { x: Math.max(0, Math.min(100 - mm.w, mm.x + dx)), y: Math.max(0, Math.min(100 - mm.h, mm.y + dy)) });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <>
      {masks.map((m) => (
        <div
          key={m.id}
          onPointerDown={(e) => startDrag(m.id, e)}
          className={`absolute cursor-move ${m.id === selected ? "outline outline-2 outline-primary" : ""}`}
          style={{
            left: `${m.x}%`, top: `${m.y}%`, width: `${m.w}%`, height: `${m.h}%`,
            backdropFilter: m.mode === "blur" ? `blur(${m.blur / 2}px)` : undefined,
            background: m.mode === "solid" ? m.color : m.mode === "gradient" ? `${m.color}bf` : undefined,
          }}
        />
      ))}
    </>
  );
}
