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
  Image as ImageIcon,
  ChevronDown,
  Layers,
  Sparkles,
  Check,
  RotateCcw,
} from "lucide-react";
import { AspectRatio, BorderSettings, DEFAULT_BORDERS, DEFAULT_SECOND_MEDIA, SecondMediaSettings } from "@/lib/editor/types";
import { VideoTemplate, saveCustomTemplate, getAllTemplates } from "@/lib/editor/templates";
import { useEditor } from "@/lib/editor/store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  templateToEdit?: VideoTemplate | null;
  onSaved?: (savedTemplate: VideoTemplate) => void;
}

interface LayerItem {
  id: string;
  name: string;
  type: "headline" | "video2" | "video1";
  visible: boolean;
}

export function TemplateStudioDialog({ open, onClose, templateToEdit, onSaved }: Props) {
  const currentItem = useEditor((s) => s.items.find((i) => i.id === s.selectedId) ?? s.items[0]);
  const globalBorders = useEditor((s) => s.globalBorders);
  const applyFramingTemplate = useEditor((s) => s.applyFramingTemplate);
  const updateGlobalBorders = useEditor((s) => s.updateGlobalBorders);
  const updateGlobalTitle = useEditor((s) => s.updateGlobalTitle);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do template
  const [templateName, setTemplateName] = useState("Studio - Dois vídeos");
  const [bgColor, setBgColor] = useState("#000000");
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [quality, setQuality] = useState("1080p");
  const [borders, setBorders] = useState<BorderSettings>({ ...DEFAULT_BORDERS });
  const [secondMedia, setSecondMedia] = useState<SecondMediaSettings>({
    ...DEFAULT_SECOND_MEDIA,
    enabled: true,
  });
  const [sampleHeadline, setSampleHeadline] = useState(
    "meu maior arrependimento foi não ter seguido essa página antes 😜",
  );

  // Accordions
  const [antiDupOpen, setAntiDupOpen] = useState(false);
  const [secondMediaOpen, setSecondMediaOpen] = useState(true);

  // Camadas
  const [layers, setLayers] = useState<LayerItem[]>([
    { id: "headline", name: "Headline 1", type: "headline", visible: true },
    { id: "video2", name: "Vídeo 2 (gameplay / satisfying)", type: "video2", visible: true },
    { id: "video1", name: "Vídeo principal (em cima)", type: "video1", visible: true },
  ]);

  // Carregar dados quando abrir
  useEffect(() => {
    if (templateToEdit) {
      setTemplateName(templateToEdit.name);
      setBgColor(templateToEdit.borders.color || "#000000");
      setAspect(templateToEdit.borders.aspect || "9:16");
      setBorders({ ...templateToEdit.borders });
      if (templateToEdit.borders.secondMedia) {
        setSecondMedia({ ...templateToEdit.borders.secondMedia });
      } else {
        setSecondMedia({ ...DEFAULT_SECOND_MEDIA, enabled: false });
      }
      if (templateToEdit.sampleHeadline) {
        setSampleHeadline(templateToEdit.sampleHeadline);
      }
    } else {
      // Novo template de 2 vídeos por padrão
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
  }, [templateToEdit, open]);

  // Upload de arquivo para Vídeo 2 ou Imagem
  const handleSecondMediaFile = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    const isVid = file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);
    const url = URL.createObjectURL(file);
    setSecondMedia((prev) => ({
      ...prev,
      enabled: true,
      type: isVid ? "video" : "image",
      src: url,
      name: file.name,
    }));
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    );
  };

  const headlineLayer = layers.find((l) => l.id === "headline");
  const video2Layer = layers.find((l) => l.id === "video2");
  const video1Layer = layers.find((l) => l.id === "video1");

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
      name: templateName.trim() || "Template Studio",
      borders: finalBorders,
      surface: bgColor === "#E6C51A" ? "yellow" : bgColor === "#ffffff" ? "light" : "dark",
      isCustom: true,
      sampleHeadline: headlineLayer?.visible ? sampleHeadline : undefined,
    };

    saveCustomTemplate(newTemplate);

    // Aplica imediatamente as configurações no editor ativo
    updateGlobalBorders(finalBorders);
    if (headlineLayer?.visible && sampleHeadline.trim()) {
      updateGlobalTitle({
        enabled: true,
        text: sampleHeadline,
        position: "center",
        background: true,
        backgroundColor: "#18181b",
        color: "#ffffff",
        fontSize: 3.8,
      });
    }

    toast.success(`Template "${newTemplate.name}" salvo e aplicado com sucesso!`);
    onSaved?.(newTemplate);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1240px] w-[95vw] h-[90vh] p-0 overflow-hidden bg-zinc-950 text-foreground border-zinc-800 flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3.5 bg-zinc-900/60">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-emerald-400" /> TEMPLATE STUDIO
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Editar template
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Ajuste as camadas e acompanhe o resultado na prévia em tempo real.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-semibold text-zinc-950 transition shadow-sm cursor-pointer"
          >
            <Save className="h-4 w-4" /> Salvar template
          </button>
        </div>

        {/* Main Content: 2 Colunas */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] overflow-hidden min-h-0">
          {/* Coluna Esquerda: Configurações e Camadas */}
          <div className="border-r border-zinc-800 bg-zinc-900/30 overflow-y-auto p-4 flex flex-col gap-4">
            {/* Card 1: Configuração do template */}
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

              {/* Accordion: Anti-duplicidade */}
              <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/60">
                <button
                  type="button"
                  onClick={() => setAntiDupOpen(!antiDupOpen)}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-left hover:bg-zinc-800/40 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Anti-duplicidade
                    <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-semibold text-emerald-400">
                      forte
                    </span>
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition ${antiDupOpen ? "rotate-180" : ""}`} />
                </button>
                {antiDupOpen && (
                  <div className="p-3 border-t border-zinc-800/80 text-[11px] text-muted-foreground space-y-1.5">
                    <p>Ativo: 1,01× · corte de pontas 0,5 s · metadados limpos</p>
                    <p className="text-[10px] text-zinc-500">
                      O template herda as regras globais de anti-duplicação definidas no editor.
                    </p>
                  </div>
                )}
              </div>

              {/* Accordion: Recorte e Vídeo 2 (Gameplay / Satisfying) */}
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
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition ${secondMediaOpen ? "rotate-180" : ""}`} />
                </button>

                {secondMediaOpen && (
                  <div className="p-3 border-t border-zinc-800/80 space-y-3">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={secondMedia.enabled}
                        onChange={(e) => setSecondMedia((prev) => ({ ...prev, enabled: e.target.checked }))}
                        className="rounded accent-primary"
                      />
                      <span>Ativar modo 2 vídeos / tela dividida</span>
                    </label>

                    {secondMedia.enabled && (
                      <div className="space-y-3 pt-1">
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
                              <span className="truncate">
                                {secondMedia.name || "Escolher vídeo 2 ou imagem…"}
                              </span>
                            </button>
                            {secondMedia.src && (
                              <button
                                type="button"
                                title="Remover mídia secundária"
                                onClick={() => setSecondMedia((prev) => ({ ...prev, src: null, name: null }))}
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
                            onChange={(e) => handleSecondMediaFile(e.target.files)}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Divisão da tela</span>
                            <span className="font-mono text-zinc-300">
                              {secondMedia.splitRatio}% cima / {100 - secondMedia.splitRatio}% baixo
                            </span>
                          </div>
                          <input
                            type="range"
                            min={30}
                            max={70}
                            value={secondMedia.splitRatio}
                            onChange={(e) =>
                              setSecondMedia((prev) => ({ ...prev, splitRatio: Number(e.target.value) }))
                            }
                            className="w-full"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Espaçamento central (gap)</span>
                            <span className="font-mono text-zinc-300">{secondMedia.gap}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={6}
                            step={0.5}
                            value={secondMedia.gap}
                            onChange={(e) =>
                              setSecondMedia((prev) => ({ ...prev, gap: Number(e.target.value) }))
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

            {/* Card 2: Camadas */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Layers className="h-4 w-4 text-primary" /> Camadas
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!secondMedia.enabled) {
                      setSecondMedia((prev) => ({ ...prev, enabled: true }));
                    }
                  }}
                  className="flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-300 transition"
                >
                  <Plus className="h-3 w-3" /> Adicionar
                </button>
              </div>

              <div className="space-y-1.5">
                {layers.map((layer) => {
                  const isHidden = !layer.visible;
                  return (
                    <div
                      key={layer.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
                        isHidden
                          ? "border-zinc-800/40 bg-zinc-950/40 text-muted-foreground opacity-60"
                          : "border-zinc-800 bg-zinc-950 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {layer.type === "headline" && (
                          <span className="font-bold text-amber-400">T</span>
                        )}
                        {layer.type === "video2" && (
                          <Film className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        )}
                        {layer.type === "video1" && (
                          <Film className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        <span className="truncate font-medium">{layer.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleLayerVisibility(layer.id)}
                          className="p-1 text-zinc-400 hover:text-foreground transition"
                          title={isHidden ? "Mostrar camada" : "Ocultar camada"}
                        >
                          {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        {layer.type !== "video1" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (layer.type === "video2") {
                                setSecondMedia((prev) => ({ ...prev, enabled: false }));
                              }
                              toggleLayerVisibility(layer.id);
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
          </div>

          {/* Coluna Direita: Prévia do template */}
          <div className="flex flex-col bg-zinc-950/70 p-6 overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Prévia do template</h3>
                <p className="text-[11px] text-muted-foreground">
                  Clique para selecionar, acompanhe o enquadramento e posições das camadas.
                </p>
              </div>

              {/* Headline de exemplo input */}
              {headlineLayer?.visible && (
                <div className="flex items-center gap-2 max-w-sm w-full">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">Headline:</span>
                  <input
                    value={sampleHeadline}
                    onChange={(e) => setSampleHeadline(e.target.value)}
                    placeholder="Digite a headline de exemplo…"
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>

            {/* Canvas de visualização do template */}
            <div className="flex-1 flex items-center justify-center p-4 min-h-[460px]">
              <div
                className="relative overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 flex flex-col transition-all"
                style={{
                  aspectRatio: aspect === "9:16" ? "9/16" : aspect === "1:1" ? "1/1" : aspect === "4:5" ? "4/5" : "16/9",
                  height: "min(55vh, 500px)",
                  backgroundColor: bgColor,
                }}
              >
                {/* MODO 2 VÍDEOS (SPLIT SCREEN) */}
                {secondMedia.enabled && video2Layer?.visible ? (
                  <div className="relative w-full h-full flex flex-col">
                    {/* Slot Superior: Vídeo 1 */}
                    <div
                      className="relative overflow-hidden flex items-center justify-center bg-zinc-900"
                      style={{
                        height: `calc(${secondMedia.splitRatio}% - ${secondMedia.gap / 2}%)`,
                      }}
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
                          <span className="text-xs font-semibold tracking-wider uppercase">vídeo 1 (principal)</span>
                        </div>
                      )}
                    </div>

                    {/* Espaçador central (gap) */}
                    {secondMedia.gap > 0 && (
                      <div style={{ height: `${secondMedia.gap}%`, backgroundColor: bgColor }} />
                    )}

                    {/* Slot Inferior: Vídeo 2 ou Imagem */}
                    <div
                      className="relative overflow-hidden flex items-center justify-center bg-zinc-800/80 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        height: `calc(${100 - secondMedia.splitRatio}% - ${secondMedia.gap / 2}%)`,
                      }}
                      title="Clique para enviar ou trocar o Vídeo 2 / Imagem"
                    >
                      {secondMedia.src ? (
                        secondMedia.type === "video" ? (
                          <video
                            src={secondMedia.src}
                            className="h-full w-full object-cover"
                            muted
                            loop
                            autoPlay
                            playsInline
                          />
                        ) : (
                          <img
                            src={secondMedia.src}
                            alt="Vídeo 2"
                            className="h-full w-full object-cover"
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-primary transition p-4 text-center">
                          <Film className="h-7 w-7 text-zinc-500" />
                          <span className="text-sm font-semibold tracking-wider uppercase text-zinc-300">
                            vídeo 2
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            (gameplay / satisfying / imagem)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Headline Centralizada em Badge Flutuante */}
                    {headlineLayer?.visible && sampleHeadline.trim() && (
                      <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-center px-4 z-20">
                        <div className="rounded-xl bg-zinc-950/90 border border-zinc-700/80 px-4 py-2.5 text-center text-xs font-bold text-white shadow-2xl max-w-[90%] backdrop-blur leading-snug">
                          {sampleHeadline}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* MODO ENQUADRAMENTO / VÍDEO ÚNICO PADRÃO */
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div
                      className="absolute overflow-hidden bg-zinc-900"
                      style={{
                        top: `${borders.borderTop}%`,
                        bottom: `${borders.borderBottom}%`,
                        left: `${borders.borderLeft}%`,
                        right: `${borders.borderRight}%`,
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

                    {headlineLayer?.visible && sampleHeadline.trim() && (
                      <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-center px-4 z-20">
                        <div className="rounded-xl bg-zinc-950/90 border border-zinc-700 px-4 py-2.5 text-center text-xs font-bold text-white shadow-2xl max-w-[90%]">
                          {sampleHeadline}
                        </div>
                      </div>
                    )}
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

