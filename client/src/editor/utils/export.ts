import type Konva from "konva";
import type { CanvasSettings } from "../store/editorStore";

export async function exportToPNG(stage: Konva.Stage, settings: CanvasSettings, transparent: boolean = false): Promise<void> {
  const dataUrl = stage.toDataURL({
    pixelRatio: 2,
    mimeType: "image/png",
    x: 0,
    y: 0,
    width: settings.width,
    height: settings.height,
  });
  downloadDataUrl(dataUrl, `${settings.name}.png`);
}

export async function exportToJPG(stage: Konva.Stage, settings: CanvasSettings): Promise<void> {
  const dataUrl = stage.toDataURL({
    pixelRatio: 2,
    mimeType: "image/jpeg",
    quality: 0.92,
    x: 0,
    y: 0,
    width: settings.width,
    height: settings.height,
  });
  downloadDataUrl(dataUrl, `${settings.name}.jpg`);
}

export async function exportToSVG(stage: Konva.Stage, settings: CanvasSettings): Promise<void> {
  const dataUrl = stage.toDataURL({
    pixelRatio: 1,
    mimeType: "image/png",
    x: 0,
    y: 0,
    width: settings.width,
    height: settings.height,
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${settings.width}" height="${settings.height}" viewBox="0 0 ${settings.width} ${settings.height}">
  <image width="${settings.width}" height="${settings.height}" xlink:href="${dataUrl}"/>
</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  downloadUrl(url, `${settings.name}.svg`);
  URL.revokeObjectURL(url);
}

export async function exportToVideo(
  stage: Konva.Stage,
  settings: CanvasSettings,
  duration: number,
  fps: number = 30,
  onProgress?: (progress: number) => void,
  renderFrame?: (time: number) => void,
): Promise<void> {
  const canvas = stage.toCanvas({
    pixelRatio: 1,
    x: 0,
    y: 0,
    width: settings.width,
    height: settings.height,
  });

  const stream = canvas.captureStream(fps);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: 5000000,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      downloadUrl(url, `${settings.name}.webm`);
      URL.revokeObjectURL(url);
      resolve();
    };

    mediaRecorder.start();

    const totalFrames = duration * fps;
    let frame = 0;

    const captureFrame = () => {
      if (frame >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const time = frame / fps;
      if (renderFrame) renderFrame(time);

      stage.draw();

      frame++;
      if (onProgress) onProgress(frame / totalFrames);
      requestAnimationFrame(captureFrame);
    };

    captureFrame();
  });
}

export async function exportToGIF(
  stage: Konva.Stage,
  settings: CanvasSettings,
  duration: number,
  fps: number = 10,
  onProgress?: (progress: number) => void,
  renderFrame?: (time: number) => void,
): Promise<void> {
  const totalFrames = duration * fps;
  const frames: string[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const time = i / fps;
    if (renderFrame) renderFrame(time);
    stage.draw();

    const dataUrl = stage.toDataURL({
      pixelRatio: 1,
      mimeType: "image/png",
      x: 0,
      y: 0,
      width: settings.width,
      height: settings.height,
    });
    frames.push(dataUrl);
    if (onProgress) onProgress(i / totalFrames);
  }

  const canvas = document.createElement("canvas");
  canvas.width = settings.width;
  canvas.height = settings.height;
  const ctx = canvas.getContext("2d")!;

  const images = await Promise.all(
    frames.map((src) => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      });
    })
  );

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      downloadUrl(url, `${settings.name}_animated.webm`);
      URL.revokeObjectURL(url);
      resolve();
    };

    recorder.start();
    let i = 0;
    const interval = setInterval(() => {
      if (i >= images.length) {
        clearInterval(interval);
        setTimeout(() => recorder.stop(), 100);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(images[i], 0, 0);
      i++;
    }, 1000 / fps);
  });
}

export function saveProject(data: any): void {
  const json = JSON.stringify(data);
  localStorage.setItem("design-studio-project", json);
}

export function loadSavedProject(): any | null {
  const json = localStorage.getItem("design-studio-project");
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function listSavedProjects(): { name: string; key: string; date: string }[] {
  const projects: { name: string; key: string; date: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("design-studio-")) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "{}");
        projects.push({
          name: data.canvasSettings?.name || "Untitled",
          key,
          date: data.savedAt || "",
        });
      } catch {}
    }
  }
  return projects;
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
