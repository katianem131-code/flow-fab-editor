import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { ASPECT_DIMS, BorderSettings } from "./types";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

export async function getFFmpeg(onLog?: (m: string) => void): Promise<FFmpeg> {
  if (instance) return instance;
  if (loading) return loading;
  loading = (async () => {
    const ff = new FFmpeg();
    if (onLog) ff.on("log", ({ message }) => onLog(message));
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
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

/**
 * Build an ffmpeg filter that:
 * - scales the input by the zoom factor while fitting inside the target frame
 * - pads the remaining area with the border color
 * - positions the video within the frame using posX/posY (0..100)
 */
function buildFilter(b: BorderSettings): string {
  const { w: W, h: H } = ASPECT_DIMS[b.aspect];
  const zoom = Math.max(0.5, Math.min(2, b.zoom / 100));
  // Fit inside frame at zoom=1 (contain). Zoom scales that inner size.
  // Use scale=w:h:force_original_aspect_ratio=decrease then crop if oversized.
  const innerW = `min(iw*${W}/iw\\,ih*${W}/ih)`; // placeholder — we'll use a simpler approach below
  void innerW;

  // Simpler: scale so that the larger side matches frame*zoom, keep AR, then pad, then crop to WxH.
  // scale=w=W*zoom:h=H*zoom:force_original_aspect_ratio=decrease
  const sw = Math.round(W * zoom);
  const sh = Math.round(H * zoom);

  // Position offset: 0% means top/left, 100% means bottom/right.
  // pad places scaled video at (x,y) within (W,H) but only if scaled <= frame.
  // When zoom>1, scaled may exceed frame → we crop.
  const px = (b.posX / 100).toFixed(3);
  const py = (b.posY / 100).toFixed(3);
  const color = hexToRgb(b.color);

  return [
    `scale=${sw}:${sh}:force_original_aspect_ratio=decrease`,
    // pad to at least WxH (if scaled smaller); ow/oh = max(iw,W)
    `pad=w=max(iw\\,${W}):h=max(ih\\,${H}):x=(ow-iw)*${px}:y=(oh-ih)*${py}:color=${color}`,
    // then crop to exact WxH from center (keeps positioning above)
    `crop=${W}:${H}:(iw-${W})*${px}:(ih-${H})*${py}`,
    // ensure even dims and yuv420p for h264
    `format=yuv420p`,
  ].join(",");
}

export interface ProcessOptions {
  borders: BorderSettings;
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

  const filter = buildFilter(opts.borders);

  const onProg = ({ progress }: { progress: number }) => {
    opts.onProgress?.(Math.max(0, Math.min(1, progress)));
  };
  ff.on("progress", onProg);

  try {
    await ff.writeFile(inputName, await fetchFile(file));
    await ff.exec([
      "-i",
      inputName,
      "-vf",
      filter,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
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
    // Copy into a fresh ArrayBuffer to satisfy Blob typings across TS lib versions
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    const blob = new Blob([copy], { type: "video/mp4" });
    // cleanup
    try {
      await ff.deleteFile(inputName);
      await ff.deleteFile(outputName);
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
