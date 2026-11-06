import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { ASPECT_DIMS, BorderSettings, OverlaySettings, TextOverlaySettings } from "./types";
import wasmAsset from "@/assets/ffmpeg-core.wasm.asset.json";
import type { AntiDupSettings } from "./antidup";
import { EXPORT_ENCODER_ARGS, EXPORT_FPS_FILTER } from "./encoding";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

// Core é servido pelo próprio app (mesma origem) — CDNs externos podem ser
// bloqueadas pelo navegador/rede e quebram o carregamento do engine.
const CORE_JS_URL = "/ffmpeg/ffmpeg-core.js";
const CORE_WASM_URL = "/ffmpeg/ffmpeg-core.wasm";
// Fonte TTF servida pelo próprio app (drawtext exige TTF/OTF).
const FONT_TTF_URL = "/ffmpeg/font.ttf";

let fontLoaded = false;

async function ensureFont(ff: FFmpeg) {
  if (fontLoaded) return;
  try {
    const data = await fetchFile(FONT_TTF_URL);
    await ff.writeFile("font.ttf", data);
    fontLoaded = true;
  } catch (e) {
    console.warn("Failed to load font, drawtext may fail", e);
  }
}

export async function getFFmpeg(onLog?: (m: string) => void): Promise<FFmpeg> {
  if (instance) return instance;
  if (loading) return loading;
  loading = (async () => {
    const ff = new FFmpeg();
    ff.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
      onLog?.(message);
    });
    try {
      let wasmUrl: string;
      try {
        wasmUrl = await toBlobURL(CORE_WASM_URL, "application/wasm");
      } catch {
        wasmUrl = wasmAsset?.url ?? CORE_WASM_URL;
      }

      await ff.load({
        coreURL: await toBlobURL(CORE_JS_URL, "text/javascript"),
        wasmURL: wasmUrl,
      });
    } catch (e) {
      loading = null;
      throw new Error(
        "Não foi possível carregar o engine de vídeo. Recarregue a página e tente novamente." +
          (e instanceof Error ? ` (${e.message})` : ""),
      );
    }
    await ensureFont(ff);
    instance = ff;
    return ff;
  })();
  return loading;
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return `0x${n.toUpperCase()}`;
}

function buildBorderFilter(b: BorderSettings): string {
  const { w: W, h: H } = ASPECT_DIMS[b.aspect];
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const bt = clamp(b.borderTop ?? 0, 0, 45);
  const bb = clamp(b.borderBottom ?? 0, 0, 45);
  const bl = clamp(b.borderLeft ?? 0, 0, 45);
  const br = clamp(b.borderRight ?? 0, 0, 45);
  const T = Math.round((bt / 100) * H);
  const B = Math.round((bb / 100) * H);
  const L = Math.round((bl / 100) * W);
  const R = Math.round((br / 100) * W);
  const innerW = Math.max(2, W - L - R);
  const innerH = Math.max(2, H - T - B);
  const zoom = Math.max(0.5, Math.min(2, b.zoom / 100));
  const sX = Math.max(0.3, Math.min(3, (b.stretchX ?? 100) / 100));
  const sY = Math.max(0.3, Math.min(3, (b.stretchY ?? 100) / 100));
  const sw = Math.round(innerW * zoom);
  const sh = Math.round(innerH * zoom);
  const px = (b.posX / 100).toFixed(3);
  const py = (b.posY / 100).toFixed(3);
  const color = hexToRgb(b.color);
  return [
    `scale=${sw}:${sh}:force_original_aspect_ratio=decrease`,
    `scale=trunc(iw*${sX.toFixed(3)}/2)*2:trunc(ih*${sY.toFixed(3)}/2)*2`,
    `pad=w=max(iw\\,${innerW}):h=max(ih\\,${innerH}):x=(ow-iw)*${px}:y=(oh-ih)*${py}:color=${color}`,
    `crop=${innerW}:${innerH}:(iw-${innerW})*${px}:(ih-${innerH})*${py}`,
    `pad=w=${W}:h=${H}:x=${L}:y=${T}:color=${color}`,
    `format=yuv420p`,
  ].join(",");
}

function escapeDrawtext(t: string): string {
  // ffmpeg drawtext: escape special chars
  return t
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%")
    .replace(/,/g, "\\,");
}

function buildTextFilter(
  t: TextOverlaySettings,
  text: string,
  aspect: BorderSettings["aspect"],
): string | null {
  if (!t.enabled || !text.trim()) return null;
  const { w: W, h: H } = ASPECT_DIMS[aspect];
  const fontSize = Math.max(1, Math.round((t.fontSize / 100) * H));
  const color = hexToRgb(t.color);
  const bg = hexToRgb(t.backgroundColor);
  // Anchor at (posX%, posY%) of frame, centered on that point.
  const x = `(w*${(t.posX / 100).toFixed(3)}-text_w/2)`;
  const y = `(h*${(t.posY / 100).toFixed(3)}-text_h/2)`;
  const parts = [
    `fontfile=font.ttf`,
    `text='${escapeDrawtext(text)}'`,
    `fontcolor=${color}`,
    `fontsize=${fontSize}`,
    `x=${x}`,
    `y=${y}`,
  ];
  if (t.background) {
    parts.push(`box=1`, `boxcolor=${bg}@0.85`, `boxborderw=${Math.round(fontSize * 0.3)}`);
  }
  // border black outline for readability when no box
  if (!t.background) {
    parts.push(`borderw=2`, `bordercolor=0x000000@0.6`);
  }
  void W;
  return `drawtext=${parts.join(":")}`;
}

export interface ProcessOptions {
  borders: BorderSettings;
  title?: { settings: TextOverlaySettings; text: string };
  lower?: { settings: TextOverlaySettings; text: string };
  overlay?: OverlaySettings;
  antiDup?: AntiDupSettings;
  /** Source duration in seconds (needed to trim the end). */
  duration?: number;
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
}

export async function processVideo(
  file: File,
  opts: ProcessOptions,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const inputName = "in_" + Math.random().toString(36).slice(2, 8) + getExt(file.name);
  const outputName = "out_" + Math.random().toString(36).slice(2, 8) + ".mp4";

  const ad = opts.antiDup?.enabled ? opts.antiDup : undefined;
  const speed = ad ? Math.max(0.5, Math.min(2, ad.speed)) : 1;
  const pre: string[] = [];
  if (ad?.mirror) pre.push("hflip");
  if (speed !== 1) pre.push(`setpts=PTS/${speed.toFixed(3)}`);

  const filters = [...pre, EXPORT_FPS_FILTER, buildBorderFilter(opts.borders)];
  if (opts.title) {
    const f = buildTextFilter(opts.title.settings, opts.title.text, opts.borders.aspect);
    if (f) filters.push(f);
  }
  if (opts.lower) {
    const f = buildTextFilter(opts.lower.settings, opts.lower.text, opts.borders.aspect);
    if (f) filters.push(f);
  }
  const filter = filters.join(",");

  const ov = opts.overlay;
  const useOverlay = !!(ov && ov.enabled && ov.src);
  const overlayName = "ovl_" + Math.random().toString(36).slice(2, 8) + ".png";
  const { w: FW, h: FH } = ASPECT_DIMS[opts.borders.aspect];

  const onProg = ({ progress }: { progress: number }) => {
    opts.onProgress?.(Math.max(0, Math.min(1, progress)));
  };
  ff.on("progress", onProg);

  try {
    await ff.writeFile(inputName, await fetchFile(file));

    const args: string[] = [];
    if (ad) {
      const start = Math.max(0, ad.trimStart);
      const end = Math.max(0, ad.trimEnd);
      const dur = opts.duration ?? 0;
      if (start > 0) args.push("-ss", start.toFixed(2));
      if (dur > 0 && dur - start - end > 0.5) args.push("-t", (dur - start - end).toFixed(2));
    }
    args.push("-i", inputName);
    if (useOverlay) {
      await ff.writeFile(overlayName, await fetchFile(ov!.src!));
      const ow = Math.max(2, Math.round((ov!.scale / 100) * FW));
      const opacity = Math.max(0, Math.min(1, ov!.opacity / 100)).toFixed(3);
      const x = `(${Math.round((ov!.posX / 100) * FW)}-overlay_w/2)`;
      const y = `(${Math.round((ov!.posY / 100) * FH)}-overlay_h/2)`;
      args.push(
        "-i",
        overlayName,
        "-filter_complex",
        `[0:v]${filter}[base];[1:v]scale=${ow}:-1,format=rgba,colorchannelmixer=aa=${opacity}[ovl];[base][ovl]overlay=${x}:${y}:format=auto,format=yuv420p[v]`,
        "-map",
        "[v]",
        "-map",
        "0:a?",
      );
    } else {
      args.push("-vf", filter);
    }
    if (speed !== 1) args.push("-af", `atempo=${speed.toFixed(3)}`);
    if (ad?.stripMetadata) {
      args.push(
        "-map_metadata", "-1",
        "-map_chapters", "-1",
        "-fflags", "+bitexact",
        "-flags:v", "+bitexact",
        "-flags:a", "+bitexact",
        "-metadata", "creation_time=",
        "-metadata", "encoder=",
      );
    }

    await ff.exec([
      ...args,
      "-c:v",
      "libx264",
      ...EXPORT_ENCODER_ARGS,
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputName,
    ]);
    const data = (await ff.readFile(outputName)) as Uint8Array;
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    const blob = new Blob([copy], { type: "video/mp4" });
    try {
      await ff.deleteFile(inputName);
      await ff.deleteFile(outputName);
      if (useOverlay) await ff.deleteFile(overlayName);
    } catch {
      /* noop */
    }
    return blob;
  } finally {
    ff.off("progress", onProg);
  }
}

function getExt(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i) : ".mp4";
}

/** Extract a mono 16kHz mp3 audio track — small enough for speech-to-text APIs. */
export async function extractAudio(file: File): Promise<Blob> {
  const ff = await getFFmpeg();
  const input = `sttin${getExt(file.name)}`;
  const output = "stt.mp3";
  await ff.writeFile(input, await fetchFile(file));
  try {
    await ff.exec([
      "-i",
      input,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "64k",
      output,
    ]);
    const data = (await ff.readFile(output)) as Uint8Array;
    return new Blob([data.slice().buffer as ArrayBuffer], { type: "audio/mpeg" });
  } finally {
    await ff.deleteFile(input).catch(() => {});
    await ff.deleteFile(output).catch(() => {});
  }
}

