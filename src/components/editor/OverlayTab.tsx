import { useRef } from "react";
import { useEditor } from "@/lib/editor/store";
import { MAX_OVERLAY_PRESETS } from "@/lib/editor/types";
import { Plus, Sparkles, Lock, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function OverlayTab() {
  const overlay = useEditor((s) => s.overlay);
  const presets = useEditor((s) => s.overlayPresets);
  const update = useEditor((s) => s.updateOverlay);
  const addPreset = useEditor((s) => s.addOverlayPreset);
  const removePreset = useEditor((s) => s.removeOverlayPreset);
  const applyPreset = useEditor((s) => s.applyOverlayPreset);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem (PNG com transparência recomendado)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      update({ src, name: file.name, enabled: true });
      if (presets.length < MAX_OVERLAY_PRESETS) addPreset(file.name, src);
      toast.success("Overlay carregada");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 p-3">
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Overlay (marca/logo)</span>
          <Toggle value={overlay.enabled} onChange={(v) => update({ enabled: v })} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Selecione uma pré-definição para aplicar direto, ou envie uma imagem de
          overlay para ajustar.
        </p>

        <button
          onClick={() => inputRef.current?.click()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-xs font-medium hover:bg-surface"
        >
          <Plus className="h-3.5 w-3.5" /> Enviar imagem de overlay
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {overlay.src && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 p-2">
              <img
                src={overlay.src}
                alt="Overlay"
                className="h-10 w-10 rounded object-contain"
              />
              <span className="flex-1 truncate text-[11px]">{overlay.name}</span>
              <button
                onClick={() => update({ src: null, name: null, enabled: false })}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Slider label="Tamanho" value={overlay.scale} min={5} max={100} onChange={(v) => update({ scale: v })} />
            <Slider label="Posição X" value={overlay.posX} min={0} max={100} onChange={(v) => update({ posX: v })} />
            <Slider label="Posição Y" value={overlay.posY} min={0} max={100} onChange={(v) => update({ posY: v })} />
            <Slider label="Opacidade" value={overlay.opacity} min={10} max={100} onChange={(v) => update({ opacity: v })} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" /> Criador de Overlay
          </span>
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
            NOVO
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Crie uma overlay personalizada com seu nome, @ e foto — estilo redes
          sociais.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">
            Suas Pré-definições ({presets.length}/{MAX_OVERLAY_PRESETS})
          </span>
          <button
            onClick={() => toast.info("Lista atualizada")}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        {presets.length === 0 ? (
          <p className="mt-2 text-[11px] italic text-muted-foreground">
            Nenhuma overlay salva. Envie uma imagem para salvar.
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-5 gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  removePreset(p.id);
                }}
                title={`${p.name} (clique direito para remover)`}
                className={`aspect-square overflow-hidden rounded border p-1 ${
                  overlay.src === p.src ? "border-primary" : "border-border"
                } bg-surface-2 hover:border-primary`}
              >
                <img src={p.src} alt={p.name} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        )}

        <button
          disabled
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-xs font-medium opacity-60"
        >
          <Lock className="h-3.5 w-3.5" /> Criar Overlay Personalizada
          <span className="rounded bg-border px-1.5 py-0.5 text-[9px] font-bold">PLUS</span>
        </button>
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative h-5 w-9 rounded-full transition ${value ? "bg-primary" : "bg-border"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
          value ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{value}%</span>
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
