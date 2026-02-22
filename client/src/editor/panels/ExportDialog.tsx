import { useState } from "react";
import { useEditorStore } from "../store/editorStore";
import { X, Download, Image, Film, FileImage } from "lucide-react";

type ExportFormat = "png" | "jpg" | "svg" | "video" | "gif";

export default function ExportDialog({ onClose }: { onClose: () => void }) {
  const { canvasSettings, elements, animationDuration, setAnimationTime, setAnimationPlaying } = useEditorStore();
  const [format, setFormat] = useState<ExportFormat>("png");
  const [transparent, setTransparent] = useState(false);
  const [quality, setQuality] = useState(2);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const hasAnimations = elements.some((el) => el.keyframes && el.keyframes.length > 0);

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);

    try {
      const stageElement = document.querySelector(".konvajs-content canvas") as HTMLCanvasElement;
      if (!stageElement) throw new Error("Canvas not found");

      if (format === "png" || format === "jpg" || format === "svg") {
        const canvas = document.createElement("canvas");
        canvas.width = canvasSettings.width * quality;
        canvas.height = canvasSettings.height * quality;
        const ctx = canvas.getContext("2d")!;

        if (format === "jpg" || !transparent) {
          ctx.fillStyle = canvasSettings.backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(stageElement, 0, 0, canvas.width, canvas.height);

        const mime = format === "jpg" ? "image/jpeg" : "image/png";
        const dataUrl = canvas.toDataURL(mime, format === "jpg" ? 0.92 : undefined);
        const ext = format === "svg" ? "svg" : format;

        if (format === "svg") {
          const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasSettings.width}" height="${canvasSettings.height}">
  <image width="${canvasSettings.width}" height="${canvasSettings.height}" xlink:href="${dataUrl}"/>
</svg>`;
          const blob = new Blob([svg], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          downloadFile(url, `${canvasSettings.name}.svg`);
          URL.revokeObjectURL(url);
        } else {
          downloadFile(dataUrl, `${canvasSettings.name}.${ext}`);
        }
      }

      if (format === "video" || format === "gif") {
        const canvas = document.createElement("canvas");
        canvas.width = canvasSettings.width;
        canvas.height = canvasSettings.height;
        const ctx = canvas.getContext("2d")!;
        const fps = format === "gif" ? 15 : 30;
        const totalFrames = Math.ceil(animationDuration * fps);

        const stream = canvas.captureStream(fps);
        const recorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9",
          videoBitsPerSecond: 5000000,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

        await new Promise<void>((resolve) => {
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            downloadFile(url, `${canvasSettings.name}.webm`);
            URL.revokeObjectURL(url);
            resolve();
          };

          recorder.start();

          let frame = 0;
          const captureFrame = () => {
            if (frame >= totalFrames) {
              setTimeout(() => recorder.stop(), 100);
              return;
            }

            const time = frame / fps;
            setAnimationTime(time);

            setTimeout(() => {
              const konvaCanvas = document.querySelector(".konvajs-content canvas") as HTMLCanvasElement;
              if (konvaCanvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(konvaCanvas, 0, 0, canvas.width, canvas.height);
              }

              frame++;
              setProgress(frame / totalFrames);
              requestAnimationFrame(captureFrame);
            }, 16);
          };

          captureFrame();
        });

        setAnimationTime(0);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h3 className="text-sm font-semibold text-white">Export Design</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-neutral-400 block mb-2">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "png" as const, label: "PNG", icon: <Image size={16} />, desc: "Best quality" },
                { id: "jpg" as const, label: "JPG", icon: <FileImage size={16} />, desc: "Smaller file" },
                { id: "svg" as const, label: "SVG", icon: <FileImage size={16} />, desc: "Vector" },
                { id: "video" as const, label: "Video", icon: <Film size={16} />, desc: "WebM video", disabled: !hasAnimations },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => !fmt.disabled && setFormat(fmt.id)}
                  disabled={fmt.disabled}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                    format === fmt.id
                      ? "border-blue-500 bg-blue-600/10 text-white"
                      : fmt.disabled
                      ? "border-neutral-800 text-neutral-600 cursor-not-allowed"
                      : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                  }`}
                >
                  {fmt.icon}
                  <div>
                    <p className="text-xs font-medium">{fmt.label}</p>
                    <p className="text-xs text-neutral-500">{fmt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {(format === "png" || format === "svg") && (
            <label className="flex items-center gap-2 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={transparent}
                onChange={(e) => setTransparent(e.target.checked)}
                className="rounded bg-neutral-800 border-neutral-600"
              />
              Transparent background
            </label>
          )}

          {(format === "png" || format === "jpg") && (
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Quality Scale: {quality}x</label>
              <input
                type="range"
                min={1}
                max={4}
                step={1}
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-neutral-500">
                <span>1x ({canvasSettings.width}x{canvasSettings.height})</span>
                <span>4x ({canvasSettings.width * 4}x{canvasSettings.height * 4})</span>
              </div>
            </div>
          )}

          <div className="bg-neutral-800 rounded p-3">
            <p className="text-xs text-neutral-400">
              Output: <span className="text-white">{canvasSettings.name}.{format === "video" ? "webm" : format}</span>
            </p>
            <p className="text-xs text-neutral-500">
              Size: {canvasSettings.width * (format === "png" || format === "jpg" ? quality : 1)} x {canvasSettings.height * (format === "png" || format === "jpg" ? quality : 1)}px
            </p>
          </div>

          {exporting && (
            <div>
              <div className="bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="text-xs text-neutral-400 text-center mt-1">Exporting... {Math.round(progress * 100)}%</p>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadFile(url: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
