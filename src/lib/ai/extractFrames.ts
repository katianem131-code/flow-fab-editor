/** Samples evenly spaced JPEG frames from a video file in the browser. */
export async function extractFrames(file: File, count = 12, maxSide = 512) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Não foi possível ler o vídeo."));
    });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("Duração do vídeo inválida.");
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d")!;
    const n = Math.max(2, Math.min(count, Math.ceil(duration)));
    const frames: { t: number; image: string }[] = [];
    for (let i = 0; i < n; i++) {
      // Dense early sampling captures the hook (first 3s) better.
      const t = i < 3 ? Math.min(duration - 0.05, i * 1) : ((i - 2) / (n - 2)) * (duration - 0.1);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = Math.max(0, t);
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ t: video.currentTime, image: canvas.toDataURL("image/jpeg", 0.7) });
    }
    return { frames: frames.sort((a, b) => a.t - b.t), duration };
  } finally {
    URL.revokeObjectURL(url);
  }
}
