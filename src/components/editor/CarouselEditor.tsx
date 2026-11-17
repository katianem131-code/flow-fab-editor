import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowLeftToLine,
  ArrowRightToLine,
  CalendarClock,
  Check,
  Copy,
  Download,
  ImagePlus,
  Layers3,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "./Header";
import { CarouselCanvas } from "./CarouselCanvas";
import { BatchScheduleDialog } from "./BatchScheduleDialog";
import {
  CAROUSEL_OPEN_KEY,
  carouselId,
  createCarouselProject,
  createCarouselSlide,
  createTextBox,
  duplicateCarouselSlide,
  mergeCarouselAssets,
  moveCarouselSlide,
  renderCarousel,
  renderCarouselSlide,
  replaceCarouselBackground,
  type CarouselOpenPayload,
  type CarouselProject,
  type CarouselSlide,
  type CarouselTextBox,
} from "@/lib/editor/carousel";
import {
  deleteCarouselDraft,
  loadCarouselDraft,
  saveCarouselDraft,
} from "@/lib/editor/carouselStorage";
import { loadBatchFiles, replaceBatchFiles } from "@/lib/editor/batchStorage";
import { loadBatches, saveBatch } from "@/lib/editor/batches";
import { assetMetadata, type BatchAssetInput } from "@/lib/editor/media";
import { deliverFile, zipBlobs } from "@/lib/editor/zip";

export function CarouselEditor() {
  const navigate = useNavigate();
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const newSlideInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<CarouselProject | null>(null);
  const [originalAssets, setOriginalAssets] = useState<BatchAssetInput[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [draftState, setDraftState] = useState<"saved" | "saving" | "error">("saved");
  const [busy, setBusy] = useState<"slide" | "zip" | "save" | "schedule" | null>(null);
  const [scheduleAssets, setScheduleAssets] = useState<BatchAssetInput[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const raw = sessionStorage.getItem(CAROUSEL_OPEN_KEY);
        if (!raw) throw new Error("Escolha um carrossel em um lote antes de abrir o editor.");
        const payload = JSON.parse(raw) as CarouselOpenPayload;
        const draft = await loadCarouselDraft(payload.projectId);
        const allAssets = await loadBatchFiles(payload.batchId);
        const selected = payload.assetIds?.length
          ? allAssets.filter(
              (asset) => payload.assetIds?.includes(asset.id) && asset.kind === "image",
            )
          : payload.postId
            ? allAssets.filter(
                (asset) => asset.kind === "image" && asset.source?.postId === payload.postId,
              )
            : [];
        if (cancelled) return;
        setOriginalAssets(selected);
        if (draft && draft.batchId === payload.batchId && draft.slides.length) {
          setProject(draft);
        } else {
          if (!selected.length)
            throw new Error(
              "As imagens deste carrossel não foram encontradas. Abra o lote novamente.",
            );
          setProject(createCarouselProject(payload, selected));
        }
      } catch (error) {
        if (!cancelled)
          setLoadError(
            error instanceof Error ? error.message : "Não foi possível abrir o carrossel.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!project || loading) return;
    setDraftState("saving");
    const timer = window.setTimeout(() => {
      void saveCarouselDraft(project)
        .then(() => setDraftState("saved"))
        .catch(() => setDraftState("error"));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [project, loading]);

  const updateProject = (recipe: (current: CarouselProject) => CarouselProject) => {
    setProject((current) =>
      current ? { ...recipe(current), updatedAt: new Date().toISOString() } : current,
    );
  };

  const updateSlide = (id: string, patch: Partial<CarouselSlide>) => {
    updateProject((current) => ({
      ...current,
      slides: current.slides.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)),
    }));
  };

  const updateBox = (slideId: string, boxId: string, patch: Partial<CarouselTextBox>) => {
    updateProject((current) => ({
      ...current,
      slides: current.slides.map((slide) =>
        slide.id === slideId
          ? {
              ...slide,
              boxes: slide.boxes.map((box) => (box.id === boxId ? { ...box, ...patch } : box)),
            }
          : slide,
      ),
    }));
  };

  const activeSlide = project?.slides[activeIndex] ?? project?.slides[0];
  const activeBox =
    activeSlide?.boxes.find((box) => box.id === activeBoxId) ?? activeSlide?.boxes[0];

  const resetDraft = async () => {
    if (!project || !originalAssets.length) return;
    const payload: CarouselOpenPayload = {
      projectId: project.id,
      batchId: project.batchId,
      batchName: project.batchName,
      caption: project.caption,
    };
    await deleteCarouselDraft(project.id);
    setProject(createCarouselProject(payload, originalAssets));
    setActiveIndex(0);
    setActiveBoxId(null);
    toast.success("Edições não salvas descartadas.");
  };

  const downloadActiveSlide = async () => {
    if (!project || !activeSlide) return;
    setBusy("slide");
    try {
      const asset = await renderCarouselSlide(activeSlide, project.aspect, activeIndex);
      await deliverFile(asset.file, asset.file.name);
    } catch {
      toast.error("Não foi possível gerar este slide.");
    } finally {
      setBusy(null);
    }
  };

  const downloadZip = async () => {
    if (!project) return;
    setBusy("zip");
    try {
      const assets = await renderCarousel(project);
      const entries = assets.map((asset) => ({ name: asset.file.name, blob: asset.file as Blob }));
      if (project.caption.trim()) {
        entries.push({
          name: "legenda.txt",
          blob: new Blob([project.caption], { type: "text/plain;charset=utf-8" }),
        });
      }
      const zip = await zipBlobs(
        entries,
        "Carrossel editado no LabRemix. Slides exportados em PNG, 1080 px.\n",
      );
      await deliverFile(zip, `${safeFilename(project.batchName || "carrossel")}-editado.zip`);
    } catch {
      toast.error("Não foi possível preparar o ZIP do carrossel.");
    } finally {
      setBusy(null);
    }
  };

  const openSchedule = async () => {
    if (!project) return;
    setBusy("schedule");
    try {
      setScheduleAssets(await renderCarousel(project));
      setScheduleOpen(true);
    } catch {
      toast.error("Gere as imagens novamente antes de agendar.");
    } finally {
      setBusy(null);
    }
  };

  const saveToBatch = async () => {
    if (!project) return;
    setBusy("save");
    try {
      const rendered = await renderCarousel(project);
      const allAssets = await loadBatchFiles(project.batchId);
      const merged = mergeCarouselAssets(allAssets, project.sourceIds, rendered);
      await replaceBatchFiles(project.batchId, merged);
      const existing = loadBatches().find((batch) => batch.id === project.batchId);
      const record = {
        id: project.batchId,
        name: project.batchName,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        videoCount: merged.filter((asset) => asset.kind === "video").length,
        imageCount: merged.filter((asset) => asset.kind === "image").length,
        linkCount: existing?.linkCount ?? 0,
        fileNames: merged.map((asset) => asset.file.name),
        media: merged.map(assetMetadata),
        destination: "ai" as const,
      };
      saveBatch(record);
      const nextProject: CarouselProject = {
        ...project,
        sourceIds: rendered.map((asset) => asset.id),
        slides: project.slides.map((slide, index) => ({
          ...slide,
          sourceAssetId: rendered[index].id,
        })),
        updatedAt: new Date().toISOString(),
      };
      await saveCarouselDraft(nextProject);
      sessionStorage.setItem(
        CAROUSEL_OPEN_KEY,
        JSON.stringify({
          projectId: nextProject.id,
          batchId: nextProject.batchId,
          batchName: nextProject.batchName,
          assetIds: nextProject.sourceIds,
          caption: nextProject.caption,
        } satisfies CarouselOpenPayload),
      );
      sessionStorage.setItem(
        "labremix:analise:batch",
        JSON.stringify({
          batchId: record.id,
          batchName: record.name,
          items: record.media,
        }),
      );
      toast.success("Carrossel salvo no lote. Os demais arquivos foram preservados.");
      navigate({ to: "/analise" });
    } catch {
      toast.error(
        "Não foi possível salvar o carrossel no lote. Baixe o ZIP para não perder seu trabalho.",
      );
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <Header />
        <div className="grid h-[60vh] place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (loadError || !project || !activeSlide) {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <Header />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <Layers3 className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-xl font-bold">Editor de carrossel</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loadError || "Nenhum slide disponível."}
          </p>
          <button
            onClick={() => navigate({ to: "/analise" })}
            className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Voltar à análise
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-[1500px] flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_410px]">
        <section className="flex h-[51dvh] shrink-0 flex-col border-b border-border bg-surface/20 lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
            <div className="min-w-0">
              <button
                onClick={() => navigate({ to: "/analise" })}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Análise
              </button>
              <h1 className="truncate text-sm font-bold sm:text-base">Editor de carrossel</h1>
            </div>
            <div className="flex shrink-0 rounded-md border border-border bg-background p-0.5 text-[11px]">
              {(["4:5", "1:1"] as const).map((aspect) => (
                <button
                  key={aspect}
                  onClick={() => updateProject((current) => ({ ...current, aspect }))}
                  className={`rounded px-2.5 py-1 ${project.aspect === aspect ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {aspect === "4:5" ? "4:5 vertical" : "1:1 quadrado"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-1">
            <CarouselCanvas
              slide={activeSlide}
              aspect={project.aspect}
              label={`Prévia do slide ${activeIndex + 1} de ${project.slides.length}`}
              className="h-full w-full"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-t border-border px-3 py-2 sm:px-5">
            {project.slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => {
                  setActiveIndex(index);
                  setActiveBoxId(null);
                }}
                aria-label={`Abrir slide ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`relative h-[66px] w-[54px] shrink-0 overflow-hidden rounded-md border-2 ${index === activeIndex ? "border-primary" : "border-border opacity-65"}`}
              >
                <CarouselThumbnail slide={slide} />
                <span className="absolute bottom-0.5 left-0.5 rounded bg-background/90 px-1 text-[9px] font-bold">
                  {index + 1}
                </span>
                {slide.boxes.length > 0 && (
                  <Type className="absolute right-0.5 top-0.5 h-3 w-3 rounded bg-background/80 p-0.5 text-primary" />
                )}
              </button>
            ))}
            <button
              onClick={() => newSlideInputRef.current?.click()}
              className="grid h-[66px] w-[54px] shrink-0 place-items-center rounded-md border border-dashed border-primary/60 text-primary"
              aria-label="Adicionar slide"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </section>

        <aside className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:h-[calc(100dvh-3.5rem)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                {project.batchName}
              </p>
              <h2 className="mt-1 text-lg font-bold">
                Slide {activeIndex + 1} de {project.slides.length}
              </h2>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1 text-[10px] ${draftState === "error" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {draftState === "saving" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3 text-success" />
              )}
              {draftState === "saving"
                ? "Salvando…"
                : draftState === "error"
                  ? "Rascunho não salvo"
                  : "Rascunho salvo"}
            </span>
          </div>

          <section className="mt-4 rounded-xl border border-border bg-surface/30 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                <ImagePlus className="h-4 w-4 text-primary" /> Foto de fundo
              </h3>
              <button
                onClick={() => backgroundInputRef.current?.click()}
                className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
              >
                Substituir foto
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              As frases e tarjas permanecem intactas ao trocar a foto.
            </p>
            <div className="mt-3 flex gap-2">
              {(["cover", "contain"] as const).map((fit) => (
                <button
                  key={fit}
                  onClick={() => updateSlide(activeSlide.id, { backgroundFit: fit })}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] ${activeSlide.backgroundFit === fit ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {fit === "cover" ? "Preencher" : "Mostrar inteira"}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              <IconAction
                label="Mover para trás"
                onClick={() => {
                  updateProject((current) => ({
                    ...current,
                    slides: moveCarouselSlide(current.slides, activeIndex, activeIndex - 1),
                  }));
                  setActiveIndex(activeIndex - 1);
                }}
                disabled={activeIndex === 0}
              >
                <ArrowLeftToLine className="h-4 w-4" />
              </IconAction>
              <IconAction
                label="Mover para frente"
                onClick={() => {
                  updateProject((current) => ({
                    ...current,
                    slides: moveCarouselSlide(current.slides, activeIndex, activeIndex + 1),
                  }));
                  setActiveIndex(activeIndex + 1);
                }}
                disabled={activeIndex === project.slides.length - 1}
              >
                <ArrowRightToLine className="h-4 w-4" />
              </IconAction>
              <IconAction
                label="Duplicar slide"
                onClick={() => {
                  const copy = duplicateCarouselSlide(activeSlide);
                  updateProject((current) => {
                    const slides = [...current.slides];
                    slides.splice(activeIndex + 1, 0, copy);
                    return { ...current, slides };
                  });
                  setActiveIndex(activeIndex + 1);
                  setActiveBoxId(null);
                }}
              >
                <Copy className="h-4 w-4" />
              </IconAction>
              <IconAction
                label="Excluir slide"
                danger
                disabled={project.slides.length === 1}
                onClick={() => {
                  updateProject((current) => ({
                    ...current,
                    slides: current.slides.filter((slide) => slide.id !== activeSlide.id),
                  }));
                  setActiveIndex(Math.max(0, activeIndex - 1));
                  setActiveBoxId(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </IconAction>
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-border bg-surface/30 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                <Type className="h-4 w-4 text-primary" /> Frases e tarjas (
                {activeSlide.boxes.length})
              </h3>
              <button
                onClick={() => {
                  const box = createTextBox();
                  updateSlide(activeSlide.id, { boxes: [...activeSlide.boxes, box] });
                  setActiveBoxId(box.id);
                }}
                className="flex items-center gap-1 rounded-md border border-primary/60 px-2 py-1.5 text-[11px] font-semibold text-primary"
              >
                <Plus className="h-3 w-3" /> Adicionar frase
              </button>
            </div>

            {activeSlide.boxes.length > 1 && (
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                {activeSlide.boxes.map((box, index) => (
                  <button
                    key={box.id}
                    onClick={() => setActiveBoxId(box.id)}
                    className={`shrink-0 rounded px-2 py-1 text-[10px] ${activeBox?.id === box.id ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                  >
                    Frase {index + 1}
                  </button>
                ))}
              </div>
            )}

            {activeBox ? (
              <div className="mt-3 space-y-3">
                <label className="block text-[11px] font-medium text-muted-foreground">
                  Texto
                  <textarea
                    value={activeBox.text}
                    onChange={(event) =>
                      updateBox(activeSlide.id, activeBox.id, { text: event.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm text-foreground outline-none focus:border-primary"
                    placeholder="Escreva a frase deste slide"
                  />
                </label>
                <RangeField
                  label="Tamanho da letra"
                  value={activeBox.fontSize}
                  min={24}
                  max={140}
                  unit="px"
                  onChange={(fontSize) => updateBox(activeSlide.id, activeBox.id, { fontSize })}
                />
                <RangeField
                  label="Largura da tarja"
                  value={activeBox.width}
                  min={20}
                  max={100}
                  unit="%"
                  onChange={(width) => updateBox(activeSlide.id, activeBox.id, { width })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <RangeField
                    label="Posição horizontal"
                    value={activeBox.x}
                    min={0}
                    max={80}
                    unit="%"
                    onChange={(x) => updateBox(activeSlide.id, activeBox.id, { x })}
                  />
                  <RangeField
                    label="Posição vertical"
                    value={activeBox.y}
                    min={0}
                    max={95}
                    unit="%"
                    onChange={(y) => updateBox(activeSlide.id, activeBox.id, { y })}
                  />
                </div>
                <RangeField
                  label="Opacidade do fundo"
                  value={activeBox.backgroundOpacity}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(backgroundOpacity) =>
                    updateBox(activeSlide.id, activeBox.id, { backgroundOpacity })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <ColorField
                    label="Cor da letra"
                    value={activeBox.color}
                    onChange={(color) => updateBox(activeSlide.id, activeBox.id, { color })}
                  />
                  <ColorField
                    label="Cor da tarja"
                    value={activeBox.backgroundColor}
                    onChange={(backgroundColor) =>
                      updateBox(activeSlide.id, activeBox.id, { backgroundColor })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex rounded-md border border-border bg-background p-0.5 text-[10px]">
                    {(
                      [
                        ["left", "Esquerda"],
                        ["center", "Centro"],
                        ["right", "Direita"],
                      ] as const
                    ).map(([align, label]) => (
                      <button
                        key={align}
                        onClick={() => updateBox(activeSlide.id, activeBox.id, { align })}
                        className={`rounded px-2 py-1 ${activeBox.align === align ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      updateSlide(activeSlide.id, {
                        boxes: activeSlide.boxes.filter((box) => box.id !== activeBox.id),
                      });
                      setActiveBoxId(null);
                    }}
                    className="flex items-center gap-1 text-[11px] text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir frase
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 rounded-md border border-dashed border-border p-3 text-[11px] text-muted-foreground">
                Este slide ainda não tem frases editáveis. Textos já gravados na foto original não
                são separados automaticamente; adicione sua versão acima.
              </p>
            )}
          </section>

          <section className="mt-4 rounded-xl border border-border bg-surface/30 p-3.5">
            <label className="text-xs font-semibold">Legenda para downloads e rascunho</label>
            <textarea
              value={project.caption}
              onChange={(event) =>
                updateProject((current) => ({ ...current, caption: event.target.value }))
              }
              rows={3}
              className="mt-2 w-full rounded-md border border-border bg-background p-2.5 text-xs outline-none focus:border-primary"
              placeholder="Legenda da postagem (opcional)"
            />
          </section>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={downloadActiveSlide}
              disabled={busy !== null}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs font-semibold disabled:opacity-50"
            >
              {busy === "slide" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4 text-primary" />
              )}{" "}
              Baixar slide
            </button>
            <button
              onClick={downloadZip}
              disabled={busy !== null}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs font-semibold disabled:opacity-50"
            >
              {busy === "zip" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Package className="h-4 w-4 text-primary" />
              )}{" "}
              Baixar ZIP
            </button>
            <button
              onClick={openSchedule}
              disabled={busy !== null}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-primary px-3 py-2.5 text-xs font-semibold text-primary disabled:opacity-50"
            >
              {busy === "schedule" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="h-4 w-4" />
              )}{" "}
              Agendar como rascunho
            </button>
            <button
              onClick={saveToBatch}
              disabled={busy !== null}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy === "save" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}{" "}
              Salvar carrossel no lote
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
            Salvar substitui somente estes slides no lote. O original permanece intacto até você
            confirmar.
          </p>
          {originalAssets.length > 0 && (
            <button
              onClick={() => void resetDraft()}
              className="mx-auto mt-3 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" /> Descartar edições não salvas
            </button>
          )}

          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) updateSlide(activeSlide.id, replaceCarouselBackground(activeSlide, file));
              event.target.value = "";
            }}
          />
          <input
            ref={newSlideInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                const slide = createCarouselSlide(file);
                slide.boxes = [createTextBox("Nova frase")];
                updateProject((current) => ({ ...current, slides: [...current.slides, slide] }));
                setActiveIndex(project.slides.length);
                setActiveBoxId(slide.boxes[0].id);
              }
              event.target.value = "";
            }}
          />
        </aside>
      </main>
      <BatchScheduleDialog
        assets={scheduleAssets}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        initialCaption={project.caption}
      />
    </div>
  );
}

function CarouselThumbnail({ slide }: { slide: CarouselSlide }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(slide.background);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [slide.background]);
  return url ? (
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="h-full w-full bg-surface" />
  );
}

function IconAction({
  label,
  children,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-9 place-items-center rounded-md border border-border bg-background disabled:opacity-30 ${danger ? "text-destructive" : "text-muted-foreground hover:text-primary"}`}
    >
      {children}
    </button>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-[10px] text-muted-foreground">
      <span className="flex justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono text-foreground">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-[10px] text-muted-foreground">
      <span>{label}</span>
      <input
        aria-label={label}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0"
      />
    </label>
  );
}

function safeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_");
}
