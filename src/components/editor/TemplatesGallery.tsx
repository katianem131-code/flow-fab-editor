import { useRef } from "react";
import { Check, ChevronLeft, ChevronRight, LayoutTemplate, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditor, effectiveBorders } from "@/lib/editor/store";
import { useAntiDup } from "@/lib/editor/antidup";
import { VIDEO_TEMPLATES, matchesTemplate } from "@/lib/editor/templates";
import { ASPECT_DIMS } from "@/lib/editor/types";

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

  return (
    <section className="min-w-0 border-b border-border pb-4" aria-label="Templates de vídeo">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><LayoutTemplate className="h-4 w-4 text-primary" />Templates</h3>
        <span className="text-[10px] text-muted-foreground">{mode === "single" ? "Este vídeo" : "Todos os vídeos"}</span>
      </div>
      <div ref={rail} className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Escolher enquadramento">
        {VIDEO_TEMPLATES.map((template) => {
          const b = template.borders;
          const dims = ASPECT_DIMS[b.aspect];
          const active = matchesTemplate(borders, template);
          return (
            <Button key={template.id} variant="ghost" aria-label={`Aplicar template ${template.name}`} aria-pressed={active}
              onClick={() => apply(template.id)}
              className={`h-auto w-[100px] shrink-0 flex-col gap-2 whitespace-normal rounded-md border p-1.5 hover:bg-surface-2 ${active ? "border-primary bg-primary/10" : "border-border bg-surface"}`}>
              <span className={`template-mini template-mini--${template.surface} relative flex h-[142px] w-full items-center justify-center overflow-hidden rounded-sm`}>
                <span className="relative block w-full overflow-hidden" style={{ aspectRatio: `${dims.w}/${dims.h}`, maxHeight: "100%", height: b.aspect === "9:16" ? "100%" : undefined }}>
                  <span className="absolute flex items-center justify-center overflow-hidden bg-muted text-muted-foreground" style={{ top: `${b.borderTop}%`, bottom: `${b.borderBottom}%`, left: `${b.borderLeft}%`, right: `${b.borderRight}%` }}>
                    {item ? (
                      <video
                        src={item.previewUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover transition-transform duration-200"
                        style={{ transform: isMirrored ? "scaleX(-1)" : undefined }}
                      />
                    ) : (
                      <Film className="h-5 w-5" />
                    )}
                  </span>
                </span>
                {active && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}
              </span>
              <span className="flex min-h-8 items-center justify-center text-center text-[10px] leading-4">{template.name}</span>
            </Button>
          );
        })}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" aria-label="Templates anteriores" title="Templates anteriores" onClick={() => rail.current?.scrollBy({ left: -224, behavior: "smooth" })}><ChevronLeft /></Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" aria-label="Próximos templates" title="Próximos templates" onClick={() => rail.current?.scrollBy({ left: 224, behavior: "smooth" })}><ChevronRight /></Button>
      </div>
    </section>
  );
}