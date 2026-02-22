import { useState, useRef } from "react";
import { useEditorStore } from "../store/editorStore";
import { Upload, ImageIcon, X } from "lucide-react";

export default function UploadsPanel() {
  const { addElement } = useEditorStore();
  const [uploads, setUploads] = useState<{ name: string; src: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        setUploads((prev) => [...prev, { name: file.name, src }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const addImageToCanvas = (src: string, name: string) => {
    const img = new window.Image();
    img.onload = () => {
      const maxW = 400;
      const maxH = 400;
      let w = img.width;
      let h = img.height;
      if (w > maxW) { h = (maxW / w) * h; w = maxW; }
      if (h > maxH) { w = (maxH / h) * w; h = maxH; }

      addElement({
        id: "",
        type: "image",
        name: name,
        x: 100,
        y: 100,
        width: w,
        height: h,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        imageSrc: src,
        imageFilters: { brightness: 0, contrast: 0, saturation: 0, blur: 0 },
      });
    };
    img.src = src;
  };

  const removeUpload = (idx: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white mb-3">Uploads</h3>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-neutral-600 hover:border-blue-500 text-neutral-400 hover:text-blue-400 transition-colors"
        >
          <Upload size={18} />
          <span className="text-sm">Upload Images</span>
        </button>
        <p className="text-xs text-neutral-500 mt-1.5 text-center">PNG, JPG, SVG, GIF supported</p>
      </div>

      <div className="border-t border-neutral-700" />

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {uploads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-neutral-500">
            <ImageIcon size={32} className="mb-2 opacity-30" />
            <p className="text-xs">No images uploaded yet</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {uploads.map((upload, idx) => (
            <div key={idx} className="relative group">
              <button
                onClick={() => addImageToCanvas(upload.src, upload.name)}
                className="w-full aspect-square rounded-lg overflow-hidden border border-neutral-700 hover:border-blue-500 transition-colors"
              >
                <img src={upload.src} alt={upload.name} className="w-full h-full object-cover" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); removeUpload(idx); }}
                className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
              <p className="text-xs text-neutral-500 truncate mt-0.5">{upload.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
