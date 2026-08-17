import { AITitleTools } from "./AITitleTools";
import { useEditor } from "@/lib/editor/store";
import { POSITION_PRESETS, TextOverlaySettings, TextPosition } from "@/lib/editor/types";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Dot } from "lucide-react";

const POSITIONS: { v: TextPosition; label: string }[] = [
  { v: "top", label: "Topo" },
  { v: "top-upper", label: "Topo cima" },
  { v: "center", label: "Centro" },
  { v: "top-lower", label: "Topo baixo" },
  { v: "bottom", label: "Rodapé" },
  { v: "free", label: "Livre" },
];

interface Props {
  value: TextOverlaySettings;
  onChange: (patch: Partial<TextOverlaySettings>) => void;
  moveLabel?: string;
}

export function TextOverlayControls({ value, onChange, moveLabel }: Props) {
  const setPosition = (p: TextPosition) => {
    if (p === "free") {
      onChange({ position: p });
    } else {
      const preset = POSITION_PRESETS[p];
      onChange({ position: p, posX: preset.x, posY: preset.y });
    }
  };
  const nudge = (dx: number, dy: number) => {
    const nx = Math.max(0, Math.min(100, value.posX + dx));
    const ny = Math.max(0, Math.min(100, value.posY + dy));
    onChange({ position: "free", posX: nx, posY: ny });
  };

  return (
    <>
      <div>
        <div className="mb-1 text-xs font-medium">Fonte</div>
        <select
          value={value.font}
          onChange={(e) => onChange({ font: e.target.value as TextOverlaySettings["font"] })}
          className="w-full rounded-md border border-border bg-surface px-2 py-2 text-xs"
        >
          <option value="system">Sistema</option>
          <option value="serif">Serifada</option>
          <option value="mono">Monoespaçada</option>
        </select>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium">Posição</div>
        <div className="grid grid-cols-3 gap-1">
          {POSITIONS.map((p) => (
            <button
              key={p.v}
              onClick={() => setPosition(p.v)}
              className={`rounded-md border px-2 py-1.5 text-[11px] transition ${
                value.position === p.v
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface hover:bg-surface-2"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface/60 p-3">
        <div className="mb-2 text-center text-[11px] text-muted-foreground">
          {moveLabel ?? "Mover"}
        </div>
        <div className="mx-auto grid w-fit grid-cols-3 gap-1">
          <div />
          <NudgeBtn onClick={() => nudge(0, -2)}><ArrowUp className="h-3 w-3" /></NudgeBtn>
          <div />
          <NudgeBtn onClick={() => nudge(-2, 0)}><ArrowLeft className="h-3 w-3" /></NudgeBtn>
          <div className="grid h-7 w-7 place-items-center text-muted-foreground">
            <Dot className="h-4 w-4" />
          </div>
          <NudgeBtn onClick={() => nudge(2, 0)}><ArrowRight className="h-3 w-3" /></NudgeBtn>
          <div />
          <NudgeBtn onClick={() => nudge(0, 2)}><ArrowDown className="h-3 w-3" /></NudgeBtn>
          <div />
        </div>
        <div className="mt-2 text-center text-[10px] tabular-nums text-muted-foreground">
          X {value.posX.toFixed(0)}% · Y {value.posY.toFixed(0)}%
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium">Tamanho da fonte</span>
          <span className="tabular-nums text-muted-foreground">{value.fontSize.toFixed(1)}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={0.1}
          value={value.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <div className="mb-1 text-xs font-medium">Cor do texto</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-8 w-12 cursor-pointer rounded border border-border bg-surface"
          />
          <input
            type="text"
            value={value.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="flex-1 rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Fundo atrás do texto</span>
        <Toggle
          checked={value.background}
          onChange={(v) => onChange({ background: v })}
        />
      </div>

      {value.background && (
        <div>
          <div className="mb-1 text-xs font-medium">Cor do fundo</div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value.backgroundColor}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="h-8 w-12 cursor-pointer rounded border border-border bg-surface"
            />
            <input
              type="text"
              value={value.backgroundColor}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="flex-1 rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs"
            />
          </div>
        </div>
      )}
    </>
  );
}

function NudgeBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md bg-surface-2 text-foreground hover:bg-primary hover:text-primary-foreground"
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${
        checked ? "bg-primary" : "bg-surface-2"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function TitleTab() {
  const items = useEditor((s) => s.items);
  const selectedId = useEditor((s) => s.selectedId);
  const t = useEditor((s) => s.globalTitle);
  const update = useEditor((s) => s.updateGlobalTitle);
  const setOverride = useEditor((s) => s.setTitleOverride);

  const item = items.find((i) => i.id === selectedId) ?? null;
  const lines = t.lines
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Título no vídeo</h3>
          <p className="text-[10px] text-muted-foreground">
            Um título por linha (cicla se houver mais vídeos)
          </p>
        </div>
        <Toggle checked={t.enabled} onChange={(v) => update({ enabled: v })} />
      </div>

      <div className="rounded-lg border border-border bg-surface/60 p-3 text-[11px]">
        <div className="mb-2 flex items-center gap-1 text-xs font-medium">
          <span className="text-primary">💡</span> Como funciona
        </div>
        <p className="text-muted-foreground">
          Cada linha vira o título de um vídeo, na ordem da lista. Se tiver mais vídeos do que linhas, os títulos repetem do começo.
        </p>
        <div className="mt-2 space-y-1 font-mono text-[10px]">
          <div className="flex items-center gap-2">
            <span className="rounded bg-surface-2 px-1.5 py-0.5">linha 1</span>
            <span>→</span>
            <span className="rounded bg-surface-2 px-1.5 py-0.5">vídeo 1</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-surface-2 px-1.5 py-0.5">linha 2</span>
            <span>→</span>
            <span className="rounded bg-surface-2 px-1.5 py-0.5">vídeo 2</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-surface-2 px-1.5 py-0.5">linha 3</span>
            <span>→</span>
            <span className="rounded bg-surface-2 px-1.5 py-0.5">vídeo 3</span>
          </div>
        </div>
      </div>

      <AITitleTools />

      <textarea

        value={t.lines}
        onChange={(e) => update({ lines: e.target.value })}
        placeholder="esse video fica mais tenso a cada segundo&#10;eu nao esperava por esse final"
        rows={4}
        className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-xs"
      />
      <div className="-mt-2 text-[10px] text-muted-foreground">
        {lines.length} título{lines.length === 1 ? "" : "s"}
      </div>

      {item && (
        <div>
          <div className="mb-1 text-xs font-medium">
            Substituir só para <span className="text-primary">{item.name}</span>
          </div>
          <textarea
            value={item.titleOverride ?? ""}
            onChange={(e) => setOverride(item.id, e.target.value)}
            placeholder="Edite o título deste vídeo"
            rows={2}
            className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-xs"
          />
        </div>
      )}

      <TextOverlayControls
        value={t}
        onChange={(p) => update(p)}
        moveLabel="Mover título"
      />
    </div>
  );
}

export function LowerTab() {
  const t = useEditor((s) => s.globalLower);
  const update = useEditor((s) => s.updateGlobalLower);
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Texto inferior</h3>
          <p className="text-[10px] text-muted-foreground">Adicionar em todos os vídeos</p>
        </div>
        <Toggle checked={t.enabled} onChange={(v) => update({ enabled: v })} />
      </div>

      <div>
        <div className="mb-1 text-xs font-medium">Texto</div>
        <textarea
          value={t.text}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="Texto exibido em todos os vídeos"
          rows={3}
          className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-xs"
        />
      </div>

      <TextOverlayControls
        value={t}
        onChange={(p) => update(p)}
        moveLabel="Mover texto"
      />
    </div>
  );
}
