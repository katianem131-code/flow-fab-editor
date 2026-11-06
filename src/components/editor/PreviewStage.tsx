import { MaskPreviewLayer } from "./MasksTab";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Download, Film } from "lucide-react";
import { useEditor, effectiveBorders, titleTextForItem } from "@/lib/editor/store";
import { useAntiDup } from "@/lib/editor/antidup";
import { ASPECT_DIMS, TextOverlaySettings } from "@/lib/editor/types";
import { downloadBlob } from "@/lib/editor/zip";

export function PreviewStage() {
  const items = useEditor((s) => s.items);
  const selectedId = useEditor((s) => s.selectedId);
  const item = items.find((i) => i.id === selectedId) ?? null;
  const itemIndex = item ? items.findIndex((i) => i.id === item.id) : 0;
  const global = useEditor((s) => s.globalBorders);
  const title = useEditor((s) => s.globalTitle);
  const lower = useEditor((s) => s.globalLower);
  const overlay = useEditor((s) => s.overlay);
  const antiDup = useAntiDup((s) => s.antiDup);
  const isMirrored = antiDup.enabled && antiDup.mirror;
  const speed = antiDup.enabled ? antiDup.speed : 1;
  const b = item ? effectiveBorders(item, global) : global;

  const videoRef = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const secondMediaInputRef = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showOutput, setShowOutput] = useState(false);

  // Arrastar vídeo para ajuste de posição (especialmente vertical)
  const editMode = useEditor((s) => s.editMode);
  const updateGlobalBorders = useEditor((s) => s.updateGlobalBorders);
  const updateItemBorders = useEditor((s) => s.updateItemBorders);

  const isSingle = editMode === "single" && !!item;
  const patchBorders = (p: Partial<typeof b>) => {
    if (isSingle && item) updateItemBorders(item.id, p);
    else updateGlobalBorders(p);
  };

  const onPickSecondMedia = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const f = files[0];
    const isVid = f.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(f.name);
    const url = URL.createObjectURL(f);
    patchBorders({
      secondMedia: {
        ...(b.secondMedia ?? {
          enabled: true,
          type: "video" as const,
          src: null,
          name: null,
          splitRatio: 50,
          gap: 2,
          volume: 0,
          loop: true,
          posX: 50,
          posY: 50,
          zoom: 100,
        }),
        enabled: true,
        type: isVid ? "video" : "image",
        src: url,
        name: f.name,
      },
    });
  };

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startPosX: number; startPosY: number } | null>(null);

  const onDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startPosX: b.posX,
      startPosY: b.posY,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (clientX: number, clientY: number) => {
      if (!dragStartRef.current) return;
      const deltaY = clientY - dragStartRef.current.y;
      const deltaX = clientX - dragStartRef.current.x;

      // Sensibilidade: arrastar para baixo traz o topo para a visão (diminui posY);
      // arrastar para cima traz a base (aumenta posY).
      const sensitivity = 0.35;
      const newPosY = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startPosY - deltaY * sensitivity)));
      const newPosX = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startPosX + (isMirrored ? -deltaX : deltaX) * sensitivity)));

      patchBorders({ posY: newPosY, posX: newPosX });
    };

    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging, isMirrored, b.posX, b.posY]);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setShowOutput(false);
  }, [item?.id]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-xl border border-dashed border-border bg-surface px-16 py-24 text-center text-sm text-muted-foreground">
          Envie um vídeo para ver o preview
        </div>
      </div>
    );
  }

  const dims = ASPECT_DIMS[b.aspect];
  const zoom = b.zoom / 100;

  const src = showOutput && item.outputUrl ? item.outputUrl : item.previewUrl;

  const toggle = () => {
    const v = videoRef.current;
    const v2 = video2Ref.current;
    if (!v) return;
    v.playbackRate = speed;
    if (v2) v2.playbackRate = speed;
    if (v.paused) {
      v.play();
      v2?.play();
      setPlaying(true);
    } else {
      v.pause();
      v2?.pause();
      setPlaying(false);
    }
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    const v2 = video2Ref.current;
    if (!v) return;
    v.currentTime = t;
    if (v2) v2.currentTime = t;
    setTime(t);
  };

  const bt = b.borderTop ?? 0;
  const bb = b.borderBottom ?? 0;
  const bl = b.borderLeft ?? 0;
  const br = b.borderRight ?? 0;

  // Tamanho do preview: dimensões normais de visualização (compacto, padrão smartphone/feed)
  const isLandscape = dims.w > dims.h;
  const controlsWidth = isLandscape ? "min(90%, 520px)" : "min(90%, 280px)";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2.5 p-4 bg-zinc-950/40 overflow-y-auto">
      {/* Container do preview com cor de fundo = cor da borda do template */}
      <div
        className="relative overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10"
        style={{
          aspectRatio: `${dims.w} / ${dims.h}`,
          height: isLandscape ? "auto" : "min(48vh, 440px)",
          width: isLandscape ? "min(85vw, 520px)" : "auto",
          maxHeight: "calc(100vh - 270px)",
          maxWidth: "100%",
          backgroundColor: b.color,
          containerType: "size",
        }}
      >
        {/* MODO 2 VÍDEOS (SPLIT SCREEN) */}
        {b.secondMedia?.enabled ? (
          <div className="relative w-full h-full flex flex-col">
            {/* Slot Superior: Vídeo 1 (Principal) */}
            <div
              onMouseDown={(e) => {
                if (e.button === 0) {
                  e.preventDefault();
                  onDragStart(e.clientX, e.clientY);
                }
              }}
              onTouchStart={(e) => {
                if (e.touches[0]) onDragStart(e.touches[0].clientX, e.touches[0].clientY);
              }}
              className={`relative overflow-hidden select-none bg-zinc-950 flex items-center justify-center ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{
                height: `calc(${b.secondMedia.splitRatio}% - ${(b.secondMedia.gap ?? 0) / 2}%)`,
              }}
              title="Vídeo principal (cima) — arraste para posicionar no enquadramento"
            >
              <video
                ref={videoRef}
                src={src}
                className="h-full w-full object-cover pointer-events-none"
                style={{
                  objectFit: "cover",
                  objectPosition: `${isMirrored ? 100 - b.posX : b.posX}% ${b.posY}%`,
                  transform: `${isMirrored ? "scaleX(-1) " : ""}scale(${zoom * ((b.stretchX ?? 100) / 100)}, ${zoom * ((b.stretchY ?? 100) / 100)})`,
                  transformOrigin: `${isMirrored ? 100 - b.posX : b.posX}% ${b.posY}%`,
                }}
                playsInline
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration);
                  e.currentTarget.playbackRate = speed;
                }}
                onPlay={(e) => {
                  e.currentTarget.playbackRate = speed;
                }}
                onEnded={() => setPlaying(false)}
              />
              <div className="pointer-events-none absolute bottom-1 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold text-white/80 uppercase tracking-wider backdrop-blur">
                Vídeo principal
              </div>
            </div>

            {/* Espaçador central (gap) */}
            {(b.secondMedia.gap ?? 0) > 0 && (
              <div style={{ height: `${b.secondMedia.gap}%`, backgroundColor: b.color }} />
            )}

            {/* Slot Inferior: Vídeo 2 ou Imagem (Gameplay / Satisfying) */}
            <div
              onClick={() => secondMediaInputRef.current?.click()}
              className="relative overflow-hidden select-none bg-zinc-900 flex items-center justify-center cursor-pointer group"
              style={{
                height: `calc(${100 - b.secondMedia.splitRatio}% - ${(b.secondMedia.gap ?? 0) / 2}%)`,
              }}
              title="Clique para escolher ou trocar o Vídeo 2 / Imagem"
            >
              {b.secondMedia.src ? (
                b.secondMedia.type === "video" ? (
                  <video
                    ref={video2Ref}
                    src={b.secondMedia.src}
                    className="h-full w-full object-cover pointer-events-none"
                    loop
                    muted
                    playsInline
                    autoPlay
                  />
                ) : (
                  <img
                    src={b.secondMedia.src}
                    alt="Mídia 2"
                    className="h-full w-full object-cover pointer-events-none"
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 text-center p-3 text-zinc-400 group-hover:text-primary transition">
                  <Film className="h-5 w-5" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                    + Adicionar Vídeo 2
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    (gameplay / satisfying / imagem)
                  </span>
                </div>
              )}

              <input
                ref={secondMediaInputRef}
                type="file"
                accept="video/*,image/*"
                hidden
                onChange={(e) => onPickSecondMedia(e.target.files)}
              />

              <div className="pointer-events-none absolute bottom-1 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-400 uppercase tracking-wider backdrop-blur opacity-80 group-hover:opacity-100 transition">
                {b.secondMedia.src ? "Vídeo 2 (clique para trocar)" : "Vídeo 2"}
              </div>
            </div>
          </div>
        ) : (
          /* MODO VÍDEO ÚNICO PADRÃO */
          <div
            onMouseDown={(e) => {
              if (e.button === 0) {
                e.preventDefault();
                onDragStart(e.clientX, e.clientY);
              }
            }}
            onTouchStart={(e) => {
              if (e.touches[0]) onDragStart(e.touches[0].clientX, e.touches[0].clientY);
            }}
            className={`absolute inset-0 overflow-hidden select-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              top: `${bt}%`,
              bottom: `${bb}%`,
              left: `${bl}%`,
              right: `${br}%`,
            }}
            title="Clique e arraste o vídeo para posicionar no enquadramento (vertical e horizontal)"
          >
            <video
              ref={videoRef}
              src={src}
              className="h-full w-full object-cover pointer-events-none"
              style={{
                objectFit: "cover",
                objectPosition: `${isMirrored ? 100 - b.posX : b.posX}% ${b.posY}%`,
                transform: `${isMirrored ? "scaleX(-1) " : ""}scale(${zoom * ((b.stretchX ?? 100) / 100)}, ${zoom * ((b.stretchY ?? 100) / 100)})`,
                transformOrigin: `${isMirrored ? 100 - b.posX : b.posX}% ${b.posY}%`,
              }}
              playsInline
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration);
                e.currentTarget.playbackRate = speed;
              }}
              onPlay={(e) => {
                e.currentTarget.playbackRate = speed;
              }}
              onEnded={() => setPlaying(false)}
            />

            <div className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-[9px] font-medium text-white/80 opacity-0 transition group-hover:opacity-100 backdrop-blur">
              ↕ Arraste para ajustar
            </div>
          </div>
        )}

        {/* Overlays de texto e imagem */}
        {item && (
          <>
            <MaskPreviewLayer />
            <TextOverlay
              settings={title}
              text={titleTextForItem(item, itemIndex < 0 ? 0 : itemIndex, title)}
            />
            <TextOverlay settings={lower} text={lower.text} />
            {overlay.enabled && overlay.src && (
              <img
                src={overlay.src}
                alt="Overlay"
                className="pointer-events-none absolute select-none"
                style={{
                  width: `${overlay.scale}%`,
                  left: `${overlay.posX}%`,
                  top: `${overlay.posY}%`,
                  transform: "translate(-50%, -50%)",
                  opacity: overlay.opacity / 100,
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Barra de controles compacta e alinhada ao preview */}
      <div
        className="flex items-center gap-2.5 rounded-lg bg-surface/90 px-3 py-1.5 shadow-sm border border-border/50 backdrop-blur"
        style={{ width: controlsWidth }}
      >
        <button
          onClick={toggle}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
          {fmt(time)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          className="flex-1 min-w-0"
        />
        <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
          {fmt(duration)}
        </span>
      </div>

      {/* Botões de resultado (pós-processamento) */}
      {item.outputUrl && (
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowOutput((v) => !v)}
            className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-2 transition"
          >
            {showOutput ? "Ver original" : "Ver resultado"}
          </button>
          <button
            onClick={() =>
              item.outputUrl &&
              fetch(item.outputUrl)
                .then((r) => r.blob())
                .then((b) => downloadBlob(b, item.outputName ?? item.name))
            }
            className="inline-flex items-center gap-1 rounded-md bg-[color:var(--success)] px-3 py-1.5 font-medium text-[color:var(--success-foreground)] hover:opacity-90 transition"
          >
            <Download className="h-3 w-3" /> Baixar MP4
          </button>
        </div>
      )}
    </div>
  );
}

function fmt(t: number) {
  if (!Number.isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TextOverlay({ settings, text }: { settings: TextOverlaySettings; text: string }) {
  if (!settings.enabled || !text.trim()) return null;
  const fontFamily =
    settings.font === "serif"
      ? "ui-serif, Georgia, serif"
      : settings.font === "mono"
        ? "ui-monospace, monospace"
        : "Inter, ui-sans-serif, system-ui, sans-serif";
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 flex w-full"
      style={{
        top: `${settings.posY}%`,
        transform: "translateY(-50%)",
        justifyContent: "center",
        padding: "0 5%",
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: `${settings.fontSize}cqh`,
          color: settings.color,
          background: settings.background ? settings.backgroundColor : "transparent",
          padding: settings.background ? "0.3em 0.6em" : 0,
          borderRadius: "0.3em",
          textShadow: settings.background ? "none" : "0 2px 4px rgba(0,0,0,0.6)",
          textAlign: "center",
          maxWidth: "90%",
          whiteSpace: "pre-wrap",
          lineHeight: 1.15,
          marginLeft: `${settings.posX - 50}%`,
        }}
      >
        {text}
      </div>
    </div>
  );
}
