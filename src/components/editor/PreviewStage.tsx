import { useEffect, useRef, useState } from "react";
import { Play, Pause, Download } from "lucide-react";
import { useEditor, effectiveBorders, titleTextForItem } from "@/lib/editor/store";
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

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
      <div
        className="relative overflow-hidden rounded-lg shadow-2xl"
        style={{
          width: "min(55vh, 100%)",
          aspectRatio: `${dims.w} / ${dims.h}`,
          backgroundColor: b.color,
          containerType: "size",
        }}
      >
        <div
          className="absolute inset-0 flex"
          style={{
            justifyContent: b.posX < 33 ? "flex-start" : b.posX > 66 ? "flex-end" : "center",
            alignItems: b.posY < 33 ? "flex-start" : b.posY > 66 ? "flex-end" : "center",
          }}
        >
          <video
            ref={videoRef}
            src={src}
            className="h-full w-full object-contain"
            style={{
              transform: `scale(${zoom}) translate(${(b.posX - 50) * 0.6}%, ${(b.posY - 50) * 0.6}%)`,
              transformOrigin: "center center",
            }}
            playsInline
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onEnded={() => setPlaying(false)}
          />
        </div>
        {item && (
          <>
            <TextOverlay
              settings={title}
              text={titleTextForItem(item, itemIndex < 0 ? 0 : itemIndex, title)}
            />
            <TextOverlay settings={lower} text={lower.text} />
          </>
        )}
      </div>

      <div className="flex w-full max-w-md items-center gap-3 rounded-lg bg-surface px-3 py-2">
        <button
          onClick={toggle}
          className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {fmt(time)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {fmt(duration)}
        </span>
      </div>

      {item.outputUrl && (
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowOutput((v) => !v)}
            className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-2"
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
            className="inline-flex items-center gap-1 rounded-md bg-[color:var(--success)] px-3 py-1.5 font-medium text-[color:var(--success-foreground)] hover:opacity-90"
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
          fontSize: `${settings.fontSize * 1.4}%`,
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
