import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { VIDEO_BUCKET } from "@/lib/cloud/sync";
import type { ScheduledPost } from "@/lib/editor/schedule";

/** Resolve private media only for the currently visible slide, using the viewer's session. */
export function ScheduledMediaPreview({ post }: { post: ScheduledPost }) {
  const paths = post.mediaPaths?.length ? post.mediaPaths : post.videoPath ? [post.videoPath] : [];
  const [index, setIndex] = useState(0);
  const [retry, setRetry] = useState(0);
  const [media, setMedia] = useState<{ path: string; url?: string; failed?: boolean } | null>(null);
  const path = paths[index];
  const kind =
    post.mediaTypes?.[index] ??
    (post.format === "image" || post.format === "carousel" ? "image" : "video");

  useEffect(() => {
    if (!path) return;
    let active = true;
    setMedia(null);
    async function load() {
      try {
        const { data, error } = await supabase.storage
          .from(VIDEO_BUCKET)
          .createSignedUrl(path, 3600);
        if (!active) return;
        setMedia(
          error || !data?.signedUrl ? { path, failed: true } : { path, url: data.signedUrl },
        );
      } catch {
        if (active) setMedia({ path, failed: true });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [path, retry]);

  const current = media?.path === path ? media : null;
  const unavailable = !path || current?.failed;
  const fail = () => {
    if (path) setMedia({ path, failed: true });
  };

  return (
    <div className="mx-auto w-full max-w-[260px] shrink-0 sm:mx-0 sm:w-[220px]">
      <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-md border border-border bg-background">
        {unavailable ? (
          <div
            className="flex flex-col items-center gap-2 p-4 text-center text-xs text-muted-foreground"
            role="status"
          >
            <ImageOff className="h-6 w-6" />
            <p>
              {path
                ? "Não foi possível carregar o material."
                : "Prévia indisponível para este agendamento."}
            </p>
            {path && (
              <Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>
                <RotateCcw /> Tentar novamente
              </Button>
            )}
          </div>
        ) : current?.url ? (
          kind === "image" ? (
            <img
              src={current.url}
              alt={`Material agendado: ${post.videoName}, slide ${index + 1}`}
              className="h-full w-full object-contain"
              onError={fail}
            />
          ) : (
            <video
              key={current.url}
              src={current.url}
              aria-label={`Vídeo agendado: ${post.videoName}`}
              className="h-full w-full object-contain"
              controls
              playsInline
              preload="metadata"
              onError={fail}
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                if (Number.isFinite(video.duration) && video.duration > 0) {
                  video.currentTime = Math.max(
                    0,
                    Math.min(post.coverSecond, video.duration - 0.01),
                  );
                }
              }}
            />
          )
        ) : (
          <LoaderCircle
            aria-label="Carregando material"
            className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none"
          />
        )}
      </div>
      {paths.length > 1 && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Slide anterior"
            title="Slide anterior"
            disabled={index === 0}
            onClick={() => setIndex((value) => value - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {index + 1} / {paths.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próximo slide"
            title="Próximo slide"
            disabled={index === paths.length - 1}
            onClick={() => setIndex((value) => value + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
