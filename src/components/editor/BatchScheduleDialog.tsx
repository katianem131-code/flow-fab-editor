import { useMediaPreviews } from "@/lib/editor/useMediaPreviews";
import { CalendarClock, Film, Image as ImageIcon, Layers3 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BatchAssetInput } from "@/lib/editor/media";
import { sharedCaption } from "@/lib/editor/media";
import { ScheduleForm } from "./ScheduleForm";

export function BatchScheduleDialog({
  assets,
  open,
  onOpenChange,
  initialCaption,
}: {
  assets: BatchAssetInput[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCaption?: string;
}) {
  const images = assets.filter((asset) => asset.kind === "image").length;
  const videos = assets.length - images;
  const previews = useMediaPreviews(assets);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-h-[92dvh] max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0 max-sm:p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /> Organizar publicação</DialogTitle>
          <DialogDescription>
            {images} imagem(ns) e {videos} vídeo(s). Imagens e carrosséis são salvos como rascunho; a publicação automática ainda não está habilitada para esses formatos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-background p-2 sm:grid-cols-6">
          {assets.map((asset, index) => (
            <div key={asset.id} className="relative aspect-square overflow-hidden rounded border border-border bg-surface">
              {asset.kind === "image" ? (
                <img src={previews.find((preview) => preview.id === asset.id)?.url} alt={asset.file.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-primary"><Film className="h-5 w-5" /></div>
              )}
              <span className="absolute bottom-0.5 right-0.5 rounded bg-background/90 px-1 text-[9px] text-foreground">{index + 1}</span>
            </div>
          ))}
        </div>
        {assets.length > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {assets.length > 1 ? <Layers3 className="h-3.5 w-3.5 text-primary" /> : <ImageIcon className="h-3.5 w-3.5 text-primary" />}
            A ordem acima será mantida no carrossel.
          </p>
        )}
        <ScheduleForm
          videoName={assets[0]?.file.name ?? "post"}
          headline={assets[0]?.file.name ?? "Novo post"}
          mediaAssets={assets}
          initialCaption={initialCaption ?? sharedCaption(assets)}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
