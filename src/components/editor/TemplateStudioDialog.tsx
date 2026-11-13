import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sliders,
  Save,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  Film,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowLeft,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import {
  AspectRatio,
  BorderSettings,
  DEFAULT_BORDERS,
  DEFAULT_SECOND_MEDIA,
  SecondMediaSettings,
} from "@/lib/editor/types";
import { VideoTemplate, saveCustomTemplate } from "@/lib/editor/templates";
import { useEditor } from "@/lib/editor/store";
import { toast } from "sonner";

// ── Headline Style ─────────────────────────────────────────────────────────────
export interface HeadlineStyle {
  x: number;         // center-X % of frame
  y: number;         // center-Y % of frame
  width: number;     // width % of frame
  rotation: number;  // degrees
  opacity: number;   // 0–100
  headlineIndex: number;
  font: string;
  fontSize: number;  // display value (÷10 = cqh in preview)
  color: string;
  bold: boolean;
  alignment: "left" | "center" | "right";
  hasBox: boolean;
  boxColor: string;
  boxCorners: number;
  boxMargin: number;
  hasOutline: boolean;
}

const DEFAULT_HEADLINE_STYLE: HeadlineStyle = {
  x: 50,
  y: 50,
  width: 90,
  rotation: 0,
  opacity: 100,
  headlineIndex: 0,
  font: "system",
  fontSize: 38,
  color: "#ffffff",
  bold: true,
  alignment: "center",
  hasBox: true,
  boxColor: "#18181b",
  boxCorners: 8,
  boxMargin: 12,
  hasOutline: false,
};

const FONTS: { value: string; label: string; css: string }[] = [
  { value: "system",     label: "Sistema (padrão)", css: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { value: "roboto",     label: "Roboto",           css: "'Roboto', sans-serif" },
  { value: "poppins",    label: "Poppins",          css: "'Poppins', sans-serif" },
  { value: "montserrat", label: "Montserrat",       css: "'Montserrat', sans-serif" },
  { value: "oswald",     label: "Oswald",           css: "'Oswald', sans-serif" },
  { value: "serif",      label: "Serif (Georgia)",  css: "ui-serif, Georgia, serif" },
  { value: "mono",       label: "Mono",             css: "ui-monospace, monospace" },
  { value: "arial",      label: "Arial",            css: "Arial, Helvetica, sans-serif" },
];

function getFontCss(v: string) {
  return FONTS.find((f) => f.value === v)?.css ?? FONTS[0].css;
}

// ── Types ──────────────────────────────────────────────────────────────────────
type SelectedLayer = "video1" | "video2" | "headline" | null;

interface LayerItem {
  id: string;
  name: string;
  type: "headline" | "video2" | "video1";
  visible: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  templateToEdit?: VideoTemplate | null;
  onSaved?: (t: VideoTemplate) => void;
}

interface DragState {
  kind: "move" | "resize";
  layer: "video2" | "headline";
  startMouseX: number;
  startMouseY: number;
  startSplitRatio: number;
  startHX: number;
  startHY: number;
  startHW: number;
  previewW: number;
  previewH: number;
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <div
      role="switch"
      aria-checked={value}
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(e) => e.key === " " && onChange()}
      className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition focus:outline-none ${
        value ? "bg-primary" : "bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          value ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </div>
  );
}

// ── Headline Properties Panel ──────────────────────────────────────────────────
function HeadlinePropertiesPanel({
  style,
  onChange,
  sampleText,
  onSampleTextChange,
}: {
  style: HeadlineStyle;
  onChange: React.Dispatch<React.SetStateAction<HeadlineStyle>>;
  sampleText: string;
  onSampleTextChange: (s: string) => void;
}) {
  const set = (patch: Partial<HeadlineStyle>) =>
    onChange((prev) => ({ ...prev, ...patch }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4 text-xs">
      {/* Title */}
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="font-black text-amber-400 text-base leading-none">T</span>
        Headline 1
      </div>

      {/* Sample text */}
      <div>
        <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
          Texto de exemplo
        </label>
        <textarea
          value={sampleText}
          onChange={(e) => onSampleTextChange(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary resize-none"
          placeholder="Texto do headline..."
        />
      </div>

      {/* Position + size grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "X %",    key: "x",     val: style.x,     min: 0,    max: 100, step: 0.5 },
          { label: "Y %",    key: "y",     val: style.y,     min: 0,    max: 100, step: 0.5 },
          { label: "Larg. %",key: "width", val: style.width,  min: 10,   max: 100, step: 1   },
          { label: "Alt. %", key: "rotation", val: style.rotation, min:-180, max: 180, step:1},
        ].map(({ label, key, val, min, max, step }) => (
          <div key={key}>
            <label className="text-[9px] uppercase font-semibold text-muted-foreground block mb-0.5">
              {label}
            </label>
            <input
              type="number"
              value={Math.round(val * 100) / 100}
              min={min}
              max={max}
              step={step}
              onChange={(e) => set({ [key]: Number(e.target.value) })}
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-1 py-1 text-[11px] text-foreground outline-none text-center"
            />
          </div>
        ))}
      </div>

      {/* Quick presets */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { label: "Largura total", fn: () => set({ x: 50, width: 100 }) },
          { label: "Centralizar",   fn: () => set({ x: 50, y: 50 })     },
          { label: "Tela cheia",    fn: () => set({ x: 50, y: 50, width: 100 }) },
        ].map(({ label, fn }) => (
          <button
            key={label}
            type="button"
            onClick={fn}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-zinc-500 transition"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Rotation slider */}
      <div>
        <div className="flex justify-between mb-1 text-muted-foreground">
          <span>Rotação: {style.rotation}°</span>
        </div>
        <input
          type="range"
          min={-45}
          max={45}
          value={style.rotation}
          onChange={(e) => set({ rotation: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Opacity slider */}
      <div>
        <div className="flex justify-between mb-1 text-muted-foreground">
          <span>Opacidade: {style.opacity}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={style.opacity}
          onChange={(e) => set({ opacity: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Headline index */}
      <div>
        <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
          Qual headline do vídeo (0 = primeira)
        </label>
        <input
          type="number"
          value={style.headlineIndex}
          min={0}
          max={9}
          onChange={(e) => set({ headlineIndex: Number(e.target.value) })}
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs outline-none"
        />
      </div>

      {/* Font + Size + Color */}
      <div className="grid grid-cols-[1fr_52px_40px] gap-2 items-end">
        <div>
          <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
            Fonte
          </label>
          <select
            value={style.font}
            onChange={(e) => set({ font: e.target.value })}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs"
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
            Tamanho
          </label>
          <input
            type="number"
            value={style.fontSize}
            min={5}
            max={150}
            step={1}
            onChange={(e) => set({ fontSize: Number(e.target.value) })}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-1.5 text-xs text-center outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
            Cor
          </label>
          <input
            type="color"
            value={style.color}
            onChange={(e) => set({ color: e.target.value })}
            className="h-[30px] w-full rounded border border-zinc-700 cursor-pointer p-0.5 bg-zinc-950"
          />
        </div>
      </div>

      {/* Bold + Alignment */}
      <div className="grid grid-cols-2 gap-3 items-start">
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <Toggle value={style.bold} onChange={() => set({ bold: !style.bold })} />
          <span className="font-semibold">Negrito</span>
        </label>
        <div>
          <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
            Alinhamento
          </label>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => set({ alignment: a })}
                className={`flex-1 flex items-center justify-center rounded border p-1.5 transition ${
                  style.alignment === a
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-zinc-700 text-muted-foreground hover:text-foreground"
                }`}
              >
                {a === "left"   && <AlignLeft   className="h-3.5 w-3.5" />}
                {a === "center" && <AlignCenter className="h-3.5 w-3.5" />}
                {a === "right"  && <AlignRight  className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Box */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-2 cursor-pointer">
          <Toggle value={style.hasBox} onChange={() => set({ hasBox: !style.hasBox })} />
          <span>Caixa atrás do texto</span>
        </label>
        {style.hasBox && (
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <div>
              <label className="text-[9px] uppercase font-semibold text-muted-foreground block mb-0.5">
                Cor da caixa
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={style.boxColor}
                  onChange={(e) => set({ boxColor: e.target.value })}
                  className="h-6 w-6 shrink-0 rounded border border-zinc-700 cursor-pointer p-0.5 bg-zinc-950"
                />
                <input
                  type="text"
                  value={style.boxColor}
                  onChange={(e) => set({ boxColor: e.target.value })}
                  className="flex-1 min-w-0 font-mono rounded border border-zinc-700 bg-zinc-950 px-1 py-1 text-[10px] outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase font-semibold text-muted-foreground block mb-0.5">
                Cantos
              </label>
              <input
                type="number"
                value={style.boxCorners}
                min={0}
                max={50}
                onChange={(e) => set({ boxCorners: Number(e.target.value) })}
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-1 py-1 text-xs text-center outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase font-semibold text-muted-foreground block mb-0.5">
                Margem
              </label>
              <input
                type="number"
                value={style.boxMargin}
                min={0}
                max={50}
                onChange={(e) => set({ boxMargin: Number(e.target.value) })}
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-1 py-1 text-xs text-center outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Outline/meme */}
      <label className="flex items-center gap-2 cursor-pointer">
        <Toggle value={style.hasOutline} onChange={() => set({ hasOutline: !style.hasOutline })} />
        <span>Contorno no texto (estilo meme)</span>
      </label>
    </div>
  );
}

// ── Video 2 Properties Panel ───────────────────────────────────────────────────
function Video2PropertiesPanel({
  secondMedia,
  onChange,
  onFileChange,
  fileInputRef,
}: {
  secondMedia: SecondMediaSettings;
  onChange: React.Dispatch<React.SetStateAction<SecondMediaSettings>>;
  onFileChange: (files: FileList | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const set = (patch: Partial<SecondMediaSettings>) =>
    onChange((prev) => ({ ...prev, ...patch }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4 text-xs">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Film className="h-4 w-4 text-emerald-400" />
        Vídeo 2 (gameplay / satisfying)
      </div>

      {/* File upload */}
      <div>
        <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
          Arquivo do Vídeo 2 ou Imagem
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="truncate">{secondMedia.name || "Escolher vídeo 2 ou imagem…"}</span>
          </button>
          {secondMedia.src && (
            <button
              type="button"
              onClick={() => set({ src: null, name: null })}
              className="p-2 text-zinc-400 hover:text-destructive transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          hidden
          onChange={(e) => onFileChange(e.target.files)}
        />
      </div>

      {/* Split ratio */}
      <div>
        <div className="flex justify-between mb-1 text-muted-foreground">
          <span>Divisão da tela</span>
          <span className="font-mono text-zinc-300">
            {secondMedia.splitRatio}% / {100 - secondMedia.splitRatio}%
          </span>
        </div>
        <input
          type="range"
          min={25}
          max={75}
          value={secondMedia.splitRatio}
          onChange={(e) => set({ splitRatio: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Gap */}
      <div>
        <div className="flex justify-between mb-1 text-muted-foreground">
          <span>Espaçamento central (gap)</span>
          <span className="font-mono text-zinc-300">{secondMedia.gap}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={6}
          step={0.5}
          value={secondMedia.gap}
          onChange={(e) => set({ gap: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Volume */}
      <div>
        <div className="flex justify-between mb-1 text-muted-foreground">
          <span>Volume do Vídeo 2</span>
          <span className="font-mono text-zinc-300">{Math.round(secondMedia.volume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={secondMedia.volume}
          onChange={(e) => set({ volume: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Loop */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={secondMedia.loop}
          onChange={(e) => set({ loop: e.target.checked })}
          className="rounded accent-primary"
        />
        <span>Repetir vídeo 2 em loop</span>
      </label>
    </div>
  );
}

// ── Main Dialog ────────────────────────────────────────────────────────────────
export function TemplateStudioDialog({ open, onClose, templateToEdit, onSaved }: Props) {
  const currentItem = useEditor(
    (s) => s.items.find((i) => i.id === s.selectedId) ?? s.items[0],
  );
  const updateGlobalBorders = useEditor((s) => s.updateGlobalBorders);
  const updateGlobalTitle   = useEditor((s) => s.updateGlobalTitle);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef   = useRef<HTMLDivElement>(null);
  const dragRef      = useRef<DragState | null>(null);

  // ── Template config ──────────────────────────────────────────────────────────
  const [templateName, setTemplateName] = useState("Studio - Dois vídeos");
  const [bgColor,      setBgColor]      = useState("#000000");
  const [aspect,       setAspect]       = useState<AspectRatio>("9:16");
  const [quality,      setQuality]      = useState("1080p");
  const [borders,      setBorders]      = useState<BorderSettings>({ ...DEFAULT_BORDERS });
  const [secondMedia,  setSecondMedia]  = useState<SecondMediaSettings>({
    ...DEFAULT_SECOND_MEDIA,
    enabled: true,
  });
  const [sampleHeadline, setSampleHeadline] = useState(
    "meu maior arrependimento foi não ter seguido essa página antes 😜",
  );

  // ── Headline style ───────────────────────────────────────────────────────────
  const [headlineStyle, setHeadlineStyle] = useState<HeadlineStyle>({
    ...DEFAULT_HEADLINE_STYLE,
  });

  // ── Layers ───────────────────────────────────────────────────────────────────
  const [layers, setLayers] = useState<LayerItem[]>([
    { id: "headline", name: "Headline 1",                     type: "headline", visible: true },
    { id: "video2",   name: "Vídeo 2 (gameplay / satisfying)", type: "video2",   visible: true },
    { id: "video1",   name: "Vídeo principal (em cima)",       type: "video1",   visible: true },
  ]);

  // ── Accordions ───────────────────────────────────────────────────────────────
  const [antiDupOpen,    setAntiDupOpen]    = useState(false);
  const [secondMediaOpen, setSecondMediaOpen] = useState(true);

  // ── Selected layer ───────────────────────────────────────────────────────────
  const [selectedLayer, setSelectedLayer] = useState<SelectedLayer>(null);

  // ── Load Google Fonts once ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const id = "gfonts-studio";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id   = id;
    link.rel  = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Poppins:wght@400;700&family=Montserrat:wght@400;700&family=Oswald:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, [open]);

  // ── Load template data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setSelectedLayer(null);
    if (templateToEdit) {
      setTemplateName(templateToEdit.name);
      setBgColor(templateToEdit.borders.color || "#000000");
      setAspect(templateToEdit.borders.aspect || "9:16");
      setBorders({ ...templateToEdit.borders });
      setSecondMedia(
        templateToEdit.borders.secondMedia
          ? { ...templateToEdit.borders.secondMedia }
          : { ...DEFAULT_SECOND_MEDIA, enabled: false },
      );
      if (templateToEdit.sampleHeadline) setSampleHeadline(templateToEdit.sampleHeadline);
    } else {
      setTemplateName("Studio - Dois vídeos");
      setBgColor("#000000");
      setAspect("9:16");
      setBorders({ ...DEFAULT_BORDERS, color: "#000000" });
      setSecondMedia({
        ...DEFAULT_SECOND_MEDIA,
        enabled: true,
        name: "Vídeo 2 (gameplay / satisfying)",
        splitRatio: 50,
        gap: 1.5,
      });
      setSampleHeadline("meu maior arrependimento foi não ter seguido essa página antes 😜");
    }
    setHeadlineStyle({ ...DEFAULT_HEADLINE_STYLE });
    setLayers([
      { id: "headline", name: "Headline 1",                     type: "headline", visible: true },
      { id: "video2",   name: "Vídeo 2 (gameplay / satisfying)", type: "video2",   visible: true },
      { id: "video1",   name: "Vídeo principal (em cima)",       type: "video1",   visible: true },
    ]);
  }, [templateToEdit, open]);

  // ── Global drag/resize handlers ──────────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dxPct = ((e.clientX - drag.startMouseX) / drag.previewW) * 100;
      const dyPct = ((e.clientY - drag.startMouseY) / drag.previewH) * 100;

      if (drag.layer === "video2") {
        // move: drag body adjusts splitRatio by moving the boundary
        // resize: drag corner pulls top boundary (bottom-right fixed)
        const newRatio =
          drag.kind === "resize"
            ? drag.startSplitRatio - dyPct  // drag up → more video1 → smaller video2
            : drag.startSplitRatio + dyPct; // drag down → boundary moves down
        setSecondMedia((prev) => ({
          ...prev,
          splitRatio: Math.round(Math.max(20, Math.min(80, newRatio)) * 10) / 10,
        }));
      } else if (drag.layer === "headline") {
        if (drag.kind === "move") {
          setHeadlineStyle((prev) => ({
            ...prev,
            x: Math.round(Math.max(5, Math.min(95, drag.startHX + dxPct)) * 10) / 10,
            y: Math.round(Math.max(5, Math.min(95, drag.startHY + dyPct)) * 10) / 10,
          }));
        } else {
          // resize: drag bottom-right corner → widen/narrow
          setHeadlineStyle((prev) => ({
            ...prev,
            width: Math.round(Math.max(10, Math.min(100, drag.startHW + dxPct * 2)) * 10) / 10,
          }));
        }
      }
    };

    const onMouseUp = () => { dragRef.current = null; };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, []);

  // ── Start drag/resize ────────────────────────────────────────────────────────
  const startDrag = (
    e: React.MouseEvent,
    layer: "video2" | "headline",
    kind: "move" | "resize",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLayer(layer);
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      kind,
      layer,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startSplitRatio: secondMedia.splitRatio,
      startHX: headlineStyle.x,
      startHY: headlineStyle.y,
      startHW: headlineStyle.width,
      previewW: rect.width,
      previewH: rect.height,
    };
  };

  // ── Layer helpers ────────────────────────────────────────────────────────────
  const toggleLayer = (id: string) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));

  const headlineLayer = layers.find((l) => l.id === "headline");
  const video2Layer   = layers.find((l) => l.id === "video2");
  const video1Layer   = layers.find((l) => l.id === "video1");

  // ── Second-media file handler ────────────────────────────────────────────────
  const handleSecondMediaFile = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file  = files[0];
    const isVid = file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);
    setSecondMedia((prev) => ({
      ...prev,
      enabled: true,
      type: isVid ? "video" : "image",
      src: URL.createObjectURL(file),
      name: file.name,
    }));
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const id = templateToEdit?.id ?? `tpl_${Math.random().toString(36).slice(2, 9)}`;
    const finalBorders: BorderSettings = {
      ...borders,
      color: bgColor,
      aspect,
      secondMedia: secondMedia.enabled ? { ...secondMedia } : undefined,
    };
    const newTemplate: VideoTemplate = {
      id,
      name:    templateName.trim() || "Template Studio",
      borders: finalBorders,
      surface: bgColor === "#E6C51A" ? "yellow" : bgColor === "#ffffff" ? "light" : "dark",
      isCustom: true,
      sampleHeadline: headlineLayer?.visible ? sampleHeadline : undefined,
    };
    saveCustomTemplate(newTemplate);
    updateGlobalBorders(finalBorders);
    if (headlineLayer?.visible && sampleHeadline.trim()) {
      const storeFont: "system" | "serif" | "mono" =
        headlineStyle.font === "serif"
          ? "serif"
          : headlineStyle.font === "mono"
            ? "mono"
            : "system";
      updateGlobalTitle({
        enabled:         true,
        text:            sampleHeadline,
        position:        "center",
        background:      headlineStyle.hasBox,
        backgroundColor: headlineStyle.boxColor,
        color:           headlineStyle.color,
        fontSize:        headlineStyle.fontSize / 10,
        font:            storeFont,
      });
    } else {
      updateGlobalTitle({ enabled: false, text: "" });
    }
    toast.success(`Template "${newTemplate.name}" salvo e aplicado!`);
    onSaved?.(newTemplate);
    onClose();
  };

  // ── Derived headline style ────────────────────────────────────────────────────
  const hlFontCss = getFontCss(headlineStyle.font);
  const hlOutline = headlineStyle.hasOutline
    ? "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.5)"
    : "none";

  const headlineEl = headlineLayer?.visible && sampleHeadline.trim() ? (
    <div
      className={`absolute z-20 ${
        selectedLayer === "headline" ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        left:      `${headlineStyle.x}%`,
        top:       `${headlineStyle.y}%`,
        width:     `${headlineStyle.width}%`,
        transform: `translate(-50%, -50%) rotate(${headlineStyle.rotation}deg)`,
        opacity:   headlineStyle.opacity / 100,
      }}
      onClick={(e) => { e.stopPropagation(); setSelectedLayer("headline"); }}
      onMouseDown={(e) => startDrag(e, "headline", "move")}
    >
      <div
        style={{
          fontFamily:  hlFontCss,
          fontWeight:  headlineStyle.bold ? 700 : 400,
          fontSize:    `${headlineStyle.fontSize / 10}cqh`,
          color:       headlineStyle.color,
          background:  headlineStyle.hasBox ? headlineStyle.boxColor : "transparent",
          padding:     headlineStyle.hasBox
            ? `${headlineStyle.boxMargin * 0.04}em ${headlineStyle.boxMargin * 0.08}em`
            : 0,
          borderRadius: headlineStyle.hasBox ? `${headlineStyle.boxCorners * 0.04}em` : 0,
          textAlign:   headlineStyle.alignment,
          width:       "100%",
          whiteSpace:  "pre-wrap",
          lineHeight:  1.2,
          textShadow:  hlOutline,
        }}
      >
        {sampleHeadline}
      </div>

      {selectedLayer === "headline" && (
        <>
          {/* Selection border */}
          <div className="absolute inset-0 border-2 border-dashed border-emerald-400 pointer-events-none rounded" />
          {/* Bottom-right resize handle */}
          <div
            className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-400 border border-zinc-950 cursor-se-resize z-10"
            onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "headline", "resize"); }}
          />
        </>
      )}
    </div>
  ) : null;

  const previewAspect =
    aspect === "9:16" ? "9/16" : aspect === "1:1" ? "1/1" : aspect === "4:5" ? "4/5" : "16/9";

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1240px] w-[95vw] h-[90vh] p-0 overflow-hidden bg-zinc-950 text-foreground border-zinc-800 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3.5 bg-zinc-900/60 shrink-0">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-emerald-400" /> TEMPLATE STUDIO
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Editar template
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Clique em uma camada na prévia para selecionar e editar suas propriedades.
            </p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-semibold text-zinc-950 transition shadow-sm cursor-pointer"
          >
            <Save className="h-4 w-4" /> Salvar template
          </button>
        </div>

        {/* Body: 2 columns */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] overflow-hidden min-h-0">

          {/* ── Left Panel ── */}
          <div className="border-r border-zinc-800 bg-zinc-900/30 overflow-y-auto p-4 flex flex-col gap-4">
            {selectedLayer !== null ? (
              <>
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setSelectedLayer(null)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition w-fit"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar às configurações
                </button>

                {selectedLayer === "headline" && (
                  <HeadlinePropertiesPanel
                    style={headlineStyle}
                    onChange={setHeadlineStyle}
                    sampleText={sampleHeadline}
                    onSampleTextChange={setSampleHeadline}
                  />
                )}

                {selectedLayer === "video2" && (
                  <Video2PropertiesPanel
                    secondMedia={secondMedia}
                    onChange={setSecondMedia}
                    onFileChange={handleSecondMediaFile}
                    fileInputRef={fileInputRef}
                  />
                )}

                {selectedLayer === "video1" && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs space-y-2">
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <Film className="h-4 w-4 text-primary" /> Vídeo principal
                    </p>
                    <p className="text-muted-foreground">
                      O vídeo principal ocupa a parte superior do layout. Ajuste zoom e posição pelo editor principal (Bordas).
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Template Config Card */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Sliders className="h-4 w-4 text-primary" /> Configuração do template
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                      Nome do template
                    </label>
                    <input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                      placeholder="Nome do template"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                        Cor de fundo
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="h-7 w-8 rounded border border-zinc-700 bg-zinc-950 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="flex-1 font-mono rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                        Qualidade
                      </label>
                      <select
                        value={quality}
                        onChange={(e) => setQuality(e.target.value)}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs"
                      >
                        <option value="1080p">1080p (Full HD)</option>
                        <option value="720p">720p (HD)</option>
                        <option value="4K">4K (Ultra)</option>
                      </select>
                    </div>
                  </div>

                  {/* Aspect ratio */}
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                      Proporção de tela
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {(["9:16", "1:1", "4:5", "16:9"] as AspectRatio[]).map((asp) => (
                        <button
                          key={asp}
                          type="button"
                          onClick={() => setAspect(asp)}
                          className={`rounded py-1 text-xs font-medium border transition ${
                            aspect === asp
                              ? "border-primary bg-primary/20 text-primary"
                              : "border-zinc-800 bg-zinc-950 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {asp}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Anti-dup accordion */}
                  <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/60">
                    <button
                      type="button"
                      onClick={() => setAntiDupOpen(!antiDupOpen)}
                      className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-left hover:bg-zinc-800/40 transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Anti-duplicidade
                        <span className="rounded bg-emerald-500/20 px-1 text-[9px] font-semibold text-emerald-400">
                          forte
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-muted-foreground transition ${antiDupOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {antiDupOpen && (
                      <div className="p-3 border-t border-zinc-800/80 text-[11px] text-muted-foreground space-y-1.5">
                        <p>Ativo: 1,01× · corte de pontas 0,5 s · metadados limpos</p>
                        <p className="text-[10px] text-zinc-500">
                          O template herda as regras globais de anti-duplicação do editor.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Second media accordion */}
                  <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/60">
                    <button
                      type="button"
                      onClick={() => setSecondMediaOpen(!secondMediaOpen)}
                      className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-left hover:bg-zinc-800/40 transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <Film className="h-3.5 w-3.5 text-primary" />
                        Recorte, música e vídeo 2
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-muted-foreground transition ${secondMediaOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {secondMediaOpen && (
                      <div className="p-3 border-t border-zinc-800/80 space-y-3">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={secondMedia.enabled}
                            onChange={(e) =>
                              setSecondMedia((prev) => ({ ...prev, enabled: e.target.checked }))
                            }
                            className="rounded accent-primary"
                          />
                          <span>Ativar modo 2 vídeos / tela dividida</span>
                        </label>
                        {secondMedia.enabled && (
                          <div className="space-y-3 pt-1">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Divisão da tela</span>
                                <span className="font-mono text-zinc-300">
                                  {secondMedia.splitRatio}% / {100 - secondMedia.splitRatio}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={25}
                                max={75}
                                value={secondMedia.splitRatio}
                                onChange={(e) =>
                                  setSecondMedia((prev) => ({
                                    ...prev,
                                    splitRatio: Number(e.target.value),
                                  }))
                                }
                                className="w-full"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Espaçamento (gap)</span>
                                <span className="font-mono text-zinc-300">{secondMedia.gap}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={6}
                                step={0.5}
                                value={secondMedia.gap}
                                onChange={(e) =>
                                  setSecondMedia((prev) => ({
                                    ...prev,
                                    gap: Number(e.target.value),
                                  }))
                                }
                                className="w-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Layers Card */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Layers className="h-4 w-4 text-primary" /> Camadas
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!secondMedia.enabled)
                          setSecondMedia((prev) => ({ ...prev, enabled: true }));
                      }}
                      className="flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-300 transition"
                    >
                      <Plus className="h-3 w-3" /> Adicionar
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground -mt-1">
                    Clique na camada para editar suas propriedades
                  </p>
                  <div className="space-y-1.5">
                    {layers.map((layer) => {
                      const hidden = !layer.visible;
                      return (
                        <div
                          key={layer.id}
                          onClick={() => setSelectedLayer(layer.type)}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition cursor-pointer ${
                            hidden
                              ? "border-zinc-800/40 bg-zinc-950/40 text-muted-foreground opacity-60"
                              : "border-zinc-800 bg-zinc-950 text-foreground hover:border-primary/60"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {layer.type === "headline" && (
                              <span className="font-black text-amber-400 text-sm leading-none">T</span>
                            )}
                            {layer.type === "video2" && (
                              <Film className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            )}
                            {layer.type === "video1" && (
                              <Film className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                            <span className="truncate font-medium">{layer.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleLayer(layer.id); }}
                              className="p-1 text-zinc-400 hover:text-foreground transition"
                              title={hidden ? "Mostrar" : "Ocultar"}
                            >
                              {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            {layer.type !== "video1" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (layer.type === "video2")
                                    setSecondMedia((prev) => ({ ...prev, enabled: false }));
                                  toggleLayer(layer.id);
                                }}
                                className="p-1 text-zinc-500 hover:text-destructive transition"
                                title="Remover camada"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Right Panel: Preview ── */}
          <div className="flex flex-col bg-zinc-950/70 p-6 overflow-y-auto">
            {/* Preview header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Prévia do template</h3>
                <p className="text-[11px] text-muted-foreground">
                  Clique para selecionar · arraste para mover · puxe o canto para redimensionar.
                </p>
              </div>
              {headlineLayer?.visible && (
                <div className="flex items-center gap-2 max-w-sm w-full">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    Headline:
                  </span>
                  <input
                    value={sampleHeadline}
                    onChange={(e) => setSampleHeadline(e.target.value)}
                    placeholder="Texto de exemplo…"
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>

            {/* Canvas */}
            <div className="flex-1 flex items-center justify-center p-4 min-h-[460px]">
              <div
                ref={previewRef}
                className="relative overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 flex flex-col transition-all select-none"
                style={{
                  aspectRatio: previewAspect,
                  height: "min(55vh, 500px)",
                  backgroundColor: bgColor,
                  containerType: "size",
                } as React.CSSProperties}
                onClick={() => setSelectedLayer(null)}
              >
                {/* SPLIT SCREEN MODE */}
                {secondMedia.enabled && video2Layer?.visible ? (
                  <div className="relative w-full h-full flex flex-col">
                    {/* Video 1 Slot */}
                    <div
                      className={`relative overflow-hidden flex items-center justify-center bg-zinc-900 ${
                        selectedLayer === "video1" ? "cursor-grabbing" : "cursor-pointer"
                      }`}
                      style={{
                        height: `calc(${secondMedia.splitRatio}% - ${secondMedia.gap / 2}%)`,
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedLayer("video1"); }}
                    >
                      {video1Layer?.visible && currentItem ? (
                        <video
                          src={currentItem.previewUrl}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 text-zinc-400">
                          <Film className="h-6 w-6 text-zinc-500" />
                          <span className="text-xs font-semibold tracking-wider uppercase">
                            vídeo 1
                          </span>
                        </div>
                      )}
                      {selectedLayer === "video1" && (
                        <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-blue-400 z-20" />
                      )}
                    </div>

                    {/* Gap */}
                    {secondMedia.gap > 0 && (
                      <div
                        style={{ height: `${secondMedia.gap}%`, backgroundColor: bgColor, flexShrink: 0 }}
                      />
                    )}

                    {/* Video 2 Slot */}
                    <div
                      className={`relative overflow-hidden flex items-center justify-center bg-zinc-800/80 ${
                        selectedLayer === "video2" ? "cursor-grabbing" : "cursor-grab"
                      }`}
                      style={{
                        height: `calc(${100 - secondMedia.splitRatio}% - ${secondMedia.gap / 2}%)`,
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedLayer("video2"); }}
                      onMouseDown={(e) => startDrag(e, "video2", "move")}
                    >
                      {secondMedia.src ? (
                        secondMedia.type === "video" ? (
                          <video
                            src={secondMedia.src}
                            className="h-full w-full object-cover pointer-events-none"
                            muted loop autoPlay playsInline
                          />
                        ) : (
                          <img
                            src={secondMedia.src}
                            alt="Mídia 2"
                            className="h-full w-full object-cover pointer-events-none"
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1.5 text-zinc-400 p-4 text-center pointer-events-none">
                          <Film className="h-7 w-7 text-zinc-500" />
                          <span className="text-sm font-semibold tracking-wider uppercase text-zinc-300">
                            vídeo 2
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            (gameplay / satisfying / imagem)
                          </span>
                        </div>
                      )}

                      {/* Video2 selection overlay */}
                      {selectedLayer === "video2" && (
                        <>
                          <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-emerald-400 z-20" />
                          {/* Bottom-right corner resize handle */}
                          <div
                            className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-400 z-30 cursor-se-resize border-l-2 border-t-2 border-zinc-950"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              startDrag(e, "video2", "resize");
                            }}
                          />
                        </>
                      )}
                    </div>

                    {/* Headline floating over split-screen */}
                    {headlineEl}
                  </div>
                ) : (
                  /* SINGLE VIDEO MODE */
                  <div className="relative w-full h-full">
                    <div
                      className="absolute overflow-hidden bg-zinc-900"
                      style={{
                        top:    `${borders.borderTop}%`,
                        bottom: `${borders.borderBottom}%`,
                        left:   `${borders.borderLeft}%`,
                        right:  `${borders.borderRight}%`,
                      }}
                    >
                      {currentItem ? (
                        <video
                          src={currentItem.previewUrl}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-semibold">
                          Área do vídeo
                        </div>
                      )}
                    </div>
                    {headlineEl}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
