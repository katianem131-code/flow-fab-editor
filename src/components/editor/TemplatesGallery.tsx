import { useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, LayoutTemplate, Film, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditor, effectiveBorders } from "@/lib/editor/store";
import { useAntiDup } from "@/lib/editor/antidup";
import { getAllTemplates, matchesTemplate, VideoTemplate } from "@/lib/editor/templates";
import { ASPECT_DIMS } from "@/lib/editor/types";
import { TemplateStudioDialog } from "./TemplateStudioDialog";

export function TemplatesGallery() {
  const rail = useRef<HTMLDivElement>(null);
  const items = useEditor((s) => s.items);
  const selectedId = useEditor((s) => s.selectedId);
  const mode = useEditor((s) => s.editMode);
  const global = useEditor((s) => s.globalBorders);
  const apply = useEditor((s) => s.applyFramingTemplate);
  const antiDup = useAntiDup((s) => s.antiDup);
  const isMirrored = antiDup.enabled && antiDup.mirror;
  const item = items.find((video) => video.id === selectedId);
  const borders = mode === "single" && item ? effectiveBorders(item, global) : global;

  const [studioOpen, setStudioOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<VideoTemplate | null>(null);

  const templates = getAllTemplates();
  const currentActiveTemplate = templates.find((t) => matchesTemplate(borders, t)) ?? templates[0];

  const handleOpenStudio = (tpl?: VideoTemplate) => {
    setTemplateToEdit(tpl ?? currentActiveTemplate ?? null);
    setStudioOpen(true);
  };

  return (
    <section className="min-w-0 border-b border-border pb-4" aria-label="Templates de vídeo">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          <span>Templates</span>
        </h3>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenStudio()}
            className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition cursor-pointer shadow-sm"
            title="Abrir o Template Studio para editar ou criar templates"
          >
            <Pencil className="h-3 w-3" />
            <span>Editar template</span>
          </button>
          <span className="text-[10px] text-muted-foreground ml-1">
            {mode === "single" ? "Este vídeo" : "Todos"}
          </span>
        </div>
      </div>

      <div ref={rail} className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Escolher enquadramento">
        {templates.map((template) => {
          const b = template.borders;
          const dims = ASPECT_DIMS[b.aspect];
          const active = matchesTemplate(borders, template);
          const hasTwoVideos = b.secondMedia?.enabled;

          return (
            <div key={template.id} className="relative group shrink-0">
              <Button
                variant="ghost"
                aria-label={`Aplicar template ${template.name}`}
                aria-pressed={active}
                onClick={() => apply(template.id)}
                className={`h-auto w-[105px] flex-col gap-2 whitespace-normal rounded-md border p-1.5 hover:bg-surface-2 transition ${
                  active ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40" : "border-border bg-surface"
                }`}
              >
                <span
                  className={`template-mini template-mini--${template.surface} relative flex h-[142px] w-full items-center justify-center overflow-hidden rounded-sm`}
                >
                  <span
                    className="relative block w-full overflow-hidden"
                    style={{
                      aspectRatio: `${dims.w}/${dims.h}`,
                      maxHeight: "100%",
                      height: b.aspect === "9:16" ? "100%" : undefined,
                    }}
                  >
                    {hasTwoVideos ? (
                      /* Miniatura de 2 Vídeos */
                      <div className="absolute inset-0 flex flex-col bg-black">
                        <div className="flex-1 bg-zinc-800 flex items-center justify-center overflow-hidden border-b border-white/20">
                          {item ? (
                            <video
                              src={item.previewUrl}
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Film className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                        </div>
                        <div className="h-3 bg-zinc-950 flex items-center justify-center">
                          <span className="h-1 w-6 rounded-full bg-white/40" />
                        </div>
                        <div className="flex-1 bg-zinc-900 flex items-center justify-center overflow-hidden">
                          <Film className="h-3.5 w-3.5 text-emerald-400/80" />
                        </div>
                      </div>
                    ) : (
                      /* Miniatura Padrão */
                      <span
                        className="absolute flex items-center justify-center overflow-hidden bg-muted text-muted-foreground"
                        style={{
                          top: `${b.borderTop}%`,
                          bottom: `${b.borderBottom}%`,
                          left: `${b.borderLeft}%`,
                          right: `${b.borderRight}%`,
                        }}
                      >
                        {item ? (
                          <video
                            src={item.previewUrl}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover transition-transform duration-200"
                            style={{
                              objectFit: "cover",
                              objectPosition: `${isMirrored ? 100 - borders.posX : borders.posX}% ${borders.posY}%`,
                              transform: isMirrored ? "scaleX(-1)" : undefined,
                            }}
                          />
                        ) : (
                          <Film className="h-5 w-5" />
                        )}
                      </span>
                    )}
                  </span>

                  {active && (
                    <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </span>
                <span className="flex min-h-8 items-center justify-center text-center text-[10px] leading-3.5 font-medium">
                  {template.name}
                </span>
              </Button>

              {/* Botão de Editar no canto da miniatura ao passar o mouse */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenStudio(template);
                }}
                className="absolute left-2.5 top-2.5 z-10 grid h-6 w-6 place-items-center rounded-md bg-zinc-950/80 text-white/90 hover:bg-primary hover:text-white transition shadow opacity-0 group-hover:opacity-100 cursor-pointer"
                title={`Editar template "${template.name}" no Studio`}
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          aria-label="Templates anteriores"
          title="Templates anteriores"
          onClick={() => rail.current?.scrollBy({ left: -224, behavior: "smooth" })}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          aria-label="Próximos templates"
          title="Próximos templates"
          onClick={() => rail.current?.scrollBy({ left: 224, behavior: "smooth" })}
        >
          <ChevronRight />
        </Button>
      </div>

      {/* Modal Template Studio */}
      <TemplateStudioDialog
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        templateToEdit={templateToEdit}
      />
    </section>
  );
}