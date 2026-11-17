import { useEffect, useRef, useState } from "react";
import { drawCarouselSlide, type CarouselAspect, type CarouselSlide } from "@/lib/editor/carousel";

export function CarouselCanvas({
  slide,
  aspect,
  className = "",
  label = "Prévia do slide",
}: {
  slide: CarouselSlide;
  aspect: CarouselAspect;
  className?: string;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    void drawCarouselSlide(canvas, slide, aspect).catch(() => {
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [slide, aspect]);

  return (
    <div className={`relative flex min-h-0 min-w-0 items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className="block h-full min-h-0 w-full min-w-0 object-contain"
      />
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-background/90 p-4 text-center text-xs text-destructive">
          Não foi possível visualizar esta imagem.
        </div>
      )}
    </div>
  );
}
