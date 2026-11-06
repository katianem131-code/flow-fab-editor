import { useEffect, useRef, useState } from "react";
import { Play, Pause, Download } from "lucide-react";
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showOutput, setShowOutput] = useState(false);

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

  const b = effectiveBorders(item, global);
  const dims = ASPECT_DIMS[b.aspect];
  const zoom = b.zoom / 100;

  const src = showOutput && item.outputUrl ? item.outputUrl : item.previewUrl;

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
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
        {/* Área do vídeo — limitada pelas bordas do template */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            top: `${bt}%`,
            bottom: `${bb}%`,
            left: `${bl}%`,
            right: `${br}%`,
          }}
        >
          <video
            ref={videoRef}
            src={src}
            // object-cover: o vídeo ocupa 100% da área entre as bordas do template sem deixar sobras cinzas
            className="h-full w-full object-cover transition-transform duration-200"
            style={{
              transform: `${isMirrored ? "scaleX(-1) " : ""}scale(${zoom * ((b.stretchX ?? 100) / 100)}, ${zoom * ((b.stretchY ?? 100) / 100)}) translate(${((b.posX - 50) * (isMirrored ? -0.6 : 0.6))}%, ${(b.posY - 50) * 0.6}%)`,
              transformOrigin: "center center",
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
        </div>

        {/* Overlays de texto e imagem */}
        {item && (
          <>
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
