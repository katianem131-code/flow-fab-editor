import { useEffect, useState } from "react";
import { ChevronDown, Fingerprint } from "lucide-react";
import { antiDupLevel, useAntiDup } from "@/lib/editor/antidup";

const SPEEDS = [
  { v: 0.9, label: "0,90× (mais lento)" },
  { v: 0.95, label: "0,95×" },
  { v: 1, label: "normal" },
  { v: 1.05, label: "1,05×" },
  { v: 1.1, label: "1,10× (mais rápido)" },
];

export function AntiDupPanel() {
  const s = useAntiDup((x) => x.antiDup);
  const update = useAntiDup((x) => x.updateAntiDup);
  const hydrate = useAntiDup((x) => x.hydrateAntiDup);
  const [open, setOpen] = useState(true);
  useEffect(() => hydrate(), [hydrate]);

  const level = antiDupLevel(s);
  const summary = [
    s.mirror ? "espelhado" : "sem espelho",
    `${s.speed.toFixed(2)}×`,
    `corta ${s.trimStart} s / ${s.trimEnd} s`,
    s.stripMetadata ? "metadados limpos" : "metadados mantidos",
  ].join(" · ");

  return (
    <div className="rounded-lg border border-border bg-surface/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Fingerprint className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">Anti-duplicidade</span>
        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          {level}
        </span>
        <ChevronDown className={`ml-auto h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {!open && <p className="px-3 pb-2 text-[10px] text-muted-foreground">{summary}</p>}
      {open && (
        <div className="flex flex-col gap-3 border-t border-border p-3">
          <Toggle label="Ativar anti-duplicidade" checked={s.enabled} onChange={(v) => update({ enabled: v })} />
          <div className={s.enabled ? "flex flex-col gap-3" : "pointer-events-none flex flex-col gap-3 opacity-40"}>
            <p className="text-[10px] text-muted-foreground">{summary}</p>
            <Toggle label="Espelhar (esquerda vira direita)" checked={s.mirror} onChange={(v) => update({ mirror: v })} />
            <Toggle label="Limpar metadados do arquivo" checked={s.stripMetadata} onChange={(v) => update({ stripMetadata: v })} />
            <label className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium">Velocidade</span>
              <select
                value={s.speed}
                onChange={(e) => update({ speed: Number(e.target.value) })}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
              >
                {SPEEDS.map((o) => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
            </label>
            <div>
              <div className="mb-1 text-xs font-medium">Cortar pontas</div>
              <div className="grid grid-cols-2 gap-2">
                <Num label="início (s)" value={s.trimStart} onChange={(v) => update({ trimStart: v })} />
                <Num label="fim (s)" value={s.trimEnd} onChange={(v) => update({ trimEnd: v })} />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Tira vinhetas, o "pisca" inicial e a tela final, e muda a duração.
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Vale para os próximos processamentos. Vídeos já prontos precisam ser reprocessados.
          </p>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[color:var(--primary)]" />
      {label}
    </label>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="text-[10px] text-muted-foreground">
      {label}
      <input
        type="number"
        min={0}
        max={10}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
        className="mt-0.5 w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
      />
    </label>
  );
}
