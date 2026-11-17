import type { BatchAssetInput, MediaSource } from "./media";

export type CarouselAspect = "4:5" | "1:1";
export type CarouselTextAlign = "left" | "center" | "right";
export type CarouselBackgroundFit = "cover" | "contain";

export interface CarouselTextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  align: CarouselTextAlign;
}

export interface CarouselSlide {
  id: string;
  sourceAssetId?: string;
  background: File;
  backgroundFit: CarouselBackgroundFit;
  boxes: CarouselTextBox[];
  source?: MediaSource;
}

export interface CarouselProject {
  id: string;
  batchId: string;
  batchName: string;
  sourceIds: string[];
  aspect: CarouselAspect;
  slides: CarouselSlide[];
  caption: string;
  updatedAt: string;
}

export interface CarouselOpenPayload {
  projectId: string;
  batchId: string;
  batchName: string;
  assetIds?: string[];
  postId?: string;
  caption?: string;
}

export const CAROUSEL_OPEN_KEY = "labremix:carrossel:open";

export function carouselId(prefix = "carousel"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createTextBox(text = "Escreva sua frase aqui"): CarouselTextBox {
  return {
    id: carouselId("texto"),
    text,
    x: 8,
    y: 72,
    width: 84,
    fontSize: 64,
    color: "#FFFFFF",
    backgroundColor: "#14213D",
    backgroundOpacity: 82,
    align: "center",
  };
}

export function createCarouselSlide(
  file: File,
  source?: MediaSource,
  sourceAssetId?: string,
): CarouselSlide {
  return {
    id: carouselId("slide"),
    sourceAssetId,
    background: file,
    backgroundFit: "cover",
    boxes: [],
    source,
  };
}

/** Replaces only the photo. Text layers and their formatting remain untouched. */
export function replaceCarouselBackground(slide: CarouselSlide, file: File): CarouselSlide {
  return { ...slide, background: file };
}

export function duplicateCarouselSlide(slide: CarouselSlide): CarouselSlide {
  return {
    ...slide,
    id: carouselId("slide"),
    sourceAssetId: undefined,
    background: new File([slide.background], slide.background.name, {
      type: slide.background.type,
      lastModified: Date.now(),
    }),
    boxes: slide.boxes.map((box) => ({ ...box, id: carouselId("texto") })),
    source: slide.source ? { ...slide.source, slideIndex: undefined } : undefined,
  };
}

export function moveCarouselSlide(
  slides: CarouselSlide[],
  from: number,
  to: number,
): CarouselSlide[] {
  if (from < 0 || from >= slides.length || to < 0 || to >= slides.length || from === to)
    return slides;
  const next = [...slides];
  const [slide] = next.splice(from, 1);
  next.splice(to, 0, slide);
  return next;
}

export function createCarouselProject(
  payload: CarouselOpenPayload,
  assets: BatchAssetInput[],
): CarouselProject {
  return {
    id: payload.projectId,
    batchId: payload.batchId,
    batchName: payload.batchName,
    sourceIds: assets.map((asset) => asset.id),
    aspect: "4:5",
    slides: assets.map((asset) => createCarouselSlide(asset.file, asset.source, asset.id)),
    caption: payload.caption ?? "",
    updatedAt: new Date().toISOString(),
  };
}

export function carouselDimensions(aspect: CarouselAspect): { width: number; height: number } {
  return aspect === "1:1" ? { width: 1080, height: 1080 } : { width: 1080, height: 1350 };
}

/** Wraps text using the same measuring callback used by Canvas. */
export function wrapCarouselText(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
      while (measure(line) > maxWidth) {
        let cut = line.length - 1;
        while (cut > 1 && measure(line.slice(0, cut)) > maxWidth) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler esta imagem."));
    };
    image.src = url;
  });
}

function hexWithOpacity(hex: string, opacity: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((part) => part + part)
          .join("")
      : clean;
  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(100, opacity)) / 100})`;
}

export async function drawCarouselSlide(
  canvas: HTMLCanvasElement,
  slide: CarouselSlide,
  aspect: CarouselAspect,
): Promise<void> {
  const { width, height } = carouselDimensions(aspect);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas não disponível neste navegador.");

  context.fillStyle = "#14213D";
  context.fillRect(0, 0, width, height);
  const image = await loadImage(slide.background);
  const scale =
    slide.backgroundFit === "cover"
      ? Math.max(width / image.naturalWidth, height / image.naturalHeight)
      : Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );

  for (const box of slide.boxes) {
    if (!box.text.trim()) continue;
    const boxWidth = width * (box.width / 100);
    const fontSize = box.fontSize;
    const padding = fontSize * 0.32;
    const textWidth = Math.max(20, boxWidth - padding * 2);
    context.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
    context.textBaseline = "top";
    const lines = wrapCarouselText(
      box.text,
      textWidth,
      (value) => context.measureText(value).width,
    );
    const lineHeight = fontSize * 1.18;
    const boxHeight = lines.length * lineHeight + padding * 2;
    const x = Math.max(0, Math.min(width - boxWidth, width * (box.x / 100)));
    const y = Math.max(0, Math.min(height - boxHeight, height * (box.y / 100)));

    if (box.backgroundOpacity > 0) {
      context.fillStyle = hexWithOpacity(box.backgroundColor, box.backgroundOpacity);
      context.fillRect(x, y, boxWidth, boxHeight);
    }
    context.fillStyle = box.color;
    context.textAlign = box.align;
    const textX =
      box.align === "left"
        ? x + padding
        : box.align === "right"
          ? x + boxWidth - padding
          : x + boxWidth / 2;
    lines.forEach((line, index) => {
      context.fillText(line, textX, y + padding + index * lineHeight, textWidth);
    });
  }
}

export async function renderCarouselSlide(
  slide: CarouselSlide,
  aspect: CarouselAspect,
  index: number,
): Promise<BatchAssetInput> {
  const canvas = document.createElement("canvas");
  await drawCarouselSlide(canvas, slide, aspect);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Falha ao gerar a imagem."))),
      "image/png",
    );
  });
  const number = String(index + 1).padStart(2, "0");
  const id = slide.sourceAssetId ?? slide.id;
  return {
    id,
    file: new File([blob], `carrossel-slide-${number}.png`, {
      type: "image/png",
      lastModified: Date.now(),
    }),
    kind: "image",
    source: {
      ...slide.source,
      postId: slide.source?.postId,
      slideIndex: index + 1,
      slideCount: 0,
    },
  };
}

export async function renderCarousel(project: CarouselProject): Promise<BatchAssetInput[]> {
  const rendered: BatchAssetInput[] = [];
  for (let index = 0; index < project.slides.length; index++) {
    rendered.push(await renderCarouselSlide(project.slides[index], project.aspect, index));
  }
  const groupPostId =
    project.slides.find((slide) => slide.source?.postId)?.source?.postId ?? project.id;
  return rendered.map((asset) => ({
    ...asset,
    source: {
      ...asset.source,
      postId: groupPostId,
      carouselProjectId: project.id,
      slideCount: project.slides.length,
      caption: project.caption.trim() || asset.source?.caption,
    },
  }));
}

/** Replaces the edited group in place, preserving every unrelated batch item. */
export function mergeCarouselAssets(
  allAssets: BatchAssetInput[],
  sourceIds: string[],
  rendered: BatchAssetInput[],
): BatchAssetInput[] {
  const selected = new Set(sourceIds);
  const merged: BatchAssetInput[] = [];
  let inserted = false;
  for (const asset of allAssets) {
    if (selected.has(asset.id)) {
      if (!inserted) {
        merged.push(...rendered);
        inserted = true;
      }
    } else {
      merged.push(asset);
    }
  }
  if (!inserted) merged.push(...rendered);
  return merged;
}
