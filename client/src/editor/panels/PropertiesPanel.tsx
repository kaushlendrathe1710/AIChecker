import { useEditorStore, type EditorElement } from "../store/editorStore";
import { FONT_LIST } from "../data/fonts";
import {
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Strikethrough,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  AlignStartHorizontal, AlignEndHorizontal, AlignStartVertical, AlignEndVertical,
} from "lucide-react";

export default function PropertiesPanel() {
  const { elements, selectedIds, updateElement, pushHistory, canvasSettings, setCanvasSettings } = useEditorStore();

  const selectedElement = selectedIds.length === 1 ? elements.find((el) => el.id === selectedIds[0]) : null;

  if (!selectedElement) {
    return (
      <div className="w-64 bg-neutral-900 border-l border-neutral-700 overflow-y-auto">
        <div className="p-3">
          <h3 className="text-sm font-semibold text-white mb-3">Canvas</h3>
          <div className="space-y-2">
            <PropRow label="Width">
              <NumberInput value={canvasSettings.width} onChange={(v) => setCanvasSettings({ width: v })} min={100} max={4000} />
            </PropRow>
            <PropRow label="Height">
              <NumberInput value={canvasSettings.height} onChange={(v) => setCanvasSettings({ height: v })} min={100} max={4000} />
            </PropRow>
            <PropRow label="Background">
              <ColorInput value={canvasSettings.backgroundColor} onChange={(v) => setCanvasSettings({ backgroundColor: v })} />
            </PropRow>
          </div>
        </div>
      </div>
    );
  }

  const el = selectedElement;
  const update = (updates: Partial<EditorElement>) => {
    updateElement(el.id, updates);
  };
  const updateAndSave = (updates: Partial<EditorElement>) => {
    updateElement(el.id, updates);
    pushHistory();
  };

  return (
    <div className="w-64 bg-neutral-900 border-l border-neutral-700 overflow-y-auto">
      <div className="p-3 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase mb-2">Transform</h3>
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <PropRow label="X"><NumberInput value={Math.round(el.x)} onChange={(v) => updateAndSave({ x: v })} /></PropRow>
              <PropRow label="Y"><NumberInput value={Math.round(el.y)} onChange={(v) => updateAndSave({ y: v })} /></PropRow>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <PropRow label="W"><NumberInput value={Math.round(el.width)} onChange={(v) => updateAndSave({ width: v })} min={1} /></PropRow>
              <PropRow label="H"><NumberInput value={Math.round(el.height)} onChange={(v) => updateAndSave({ height: v })} min={1} /></PropRow>
            </div>
            <PropRow label="Rotation"><NumberInput value={Math.round(el.rotation)} onChange={(v) => updateAndSave({ rotation: v })} /></PropRow>
            <PropRow label="Opacity">
              <input type="range" min={0} max={1} step={0.05} value={el.opacity}
                onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
                onMouseUp={() => pushHistory()}
                className="w-full accent-blue-500 h-1"
              />
              <span className="text-xs text-neutral-400 w-8 text-right">{Math.round(el.opacity * 100)}%</span>
            </PropRow>
          </div>
        </div>

        {el.type === "text" && el.textStyle && (
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase mb-2">Text</h3>
            <div className="space-y-1.5">
              <PropRow label="Font">
                <select
                  value={el.textStyle.fontFamily}
                  onChange={(e) => updateAndSave({ textStyle: { ...el.textStyle!, fontFamily: e.target.value } })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded text-xs text-white px-1 py-1 focus:outline-none"
                  style={{ fontFamily: el.textStyle.fontFamily }}
                >
                  {FONT_LIST.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                  ))}
                </select>
              </PropRow>
              <PropRow label="Size">
                <NumberInput value={el.textStyle.fontSize} onChange={(v) => updateAndSave({ textStyle: { ...el.textStyle!, fontSize: v } })} min={6} max={300} />
              </PropRow>
              <PropRow label="Color">
                <ColorInput value={el.textStyle.fill} onChange={(v) => updateAndSave({ textStyle: { ...el.textStyle!, fill: v } })} />
              </PropRow>
              <div className="flex gap-0.5">
                <StyleBtn icon={<Bold size={13} />} active={el.textStyle.fontWeight === "bold"} onClick={() => updateAndSave({ textStyle: { ...el.textStyle!, fontWeight: el.textStyle!.fontWeight === "bold" ? "normal" : "bold" } })} />
                <StyleBtn icon={<Italic size={13} />} active={el.textStyle.fontStyle === "italic"} onClick={() => updateAndSave({ textStyle: { ...el.textStyle!, fontStyle: el.textStyle!.fontStyle === "italic" ? "normal" : "italic" } })} />
                <StyleBtn icon={<Underline size={13} />} active={el.textStyle.textDecoration === "underline"} onClick={() => updateAndSave({ textStyle: { ...el.textStyle!, textDecoration: el.textStyle!.textDecoration === "underline" ? "" : "underline" } })} />
                <StyleBtn icon={<Strikethrough size={13} />} active={el.textStyle.textDecoration === "line-through"} onClick={() => updateAndSave({ textStyle: { ...el.textStyle!, textDecoration: el.textStyle!.textDecoration === "line-through" ? "" : "line-through" } })} />
                <div className="w-px bg-neutral-700 mx-0.5" />
                <StyleBtn icon={<AlignLeft size={13} />} active={el.textStyle.align === "left"} onClick={() => updateAndSave({ textStyle: { ...el.textStyle!, align: "left" } })} />
                <StyleBtn icon={<AlignCenter size={13} />} active={el.textStyle.align === "center"} onClick={() => updateAndSave({ textStyle: { ...el.textStyle!, align: "center" } })} />
                <StyleBtn icon={<AlignRight size={13} />} active={el.textStyle.align === "right"} onClick={() => updateAndSave({ textStyle: { ...el.textStyle!, align: "right" } })} />
              </div>
              <PropRow label="Line H">
                <NumberInput value={el.textStyle.lineHeight} onChange={(v) => updateAndSave({ textStyle: { ...el.textStyle!, lineHeight: v } })} min={0.5} max={5} step={0.1} />
              </PropRow>
              <PropRow label="Spacing">
                <NumberInput value={el.textStyle.letterSpacing} onChange={(v) => updateAndSave({ textStyle: { ...el.textStyle!, letterSpacing: v } })} min={-5} max={50} />
              </PropRow>
              <PropRow label="Stroke">
                <ColorInput value={el.textStyle.stroke || "#000000"} onChange={(v) => updateAndSave({ textStyle: { ...el.textStyle!, stroke: v } })} />
              </PropRow>
              <PropRow label="Stroke W">
                <NumberInput value={el.textStyle.strokeWidth || 0} onChange={(v) => updateAndSave({ textStyle: { ...el.textStyle!, strokeWidth: v } })} min={0} max={20} />
              </PropRow>
            </div>
          </div>
        )}

        {el.type === "shape" && (
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase mb-2">Shape</h3>
            <div className="space-y-1.5">
              <PropRow label="Fill">
                <ColorInput value={el.fill || "#cccccc"} onChange={(v) => updateAndSave({ fill: v })} />
              </PropRow>
              <PropRow label="Stroke">
                <ColorInput value={el.stroke || "#000000"} onChange={(v) => updateAndSave({ stroke: v })} />
              </PropRow>
              <PropRow label="Stroke W">
                <NumberInput value={el.strokeWidth || 0} onChange={(v) => updateAndSave({ strokeWidth: v })} min={0} max={50} />
              </PropRow>
              {el.shapeType === "rect" && (
                <PropRow label="Radius">
                  <NumberInput value={el.cornerRadius || 0} onChange={(v) => updateAndSave({ cornerRadius: v })} min={0} max={200} />
                </PropRow>
              )}
            </div>
          </div>
        )}

        {el.type === "image" && (
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase mb-2">Image Filters</h3>
            <div className="space-y-1.5">
              <PropRow label="Bright">
                <input type="range" min={-100} max={100} value={el.imageFilters?.brightness || 0}
                  onChange={(e) => update({ imageFilters: { ...el.imageFilters!, brightness: parseInt(e.target.value) } })}
                  onMouseUp={() => pushHistory()}
                  className="w-full accent-blue-500 h-1"
                />
              </PropRow>
              <PropRow label="Contrast">
                <input type="range" min={-100} max={100} value={el.imageFilters?.contrast || 0}
                  onChange={(e) => update({ imageFilters: { ...el.imageFilters!, contrast: parseInt(e.target.value) } })}
                  onMouseUp={() => pushHistory()}
                  className="w-full accent-blue-500 h-1"
                />
              </PropRow>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase mb-2">Shadow</h3>
          <div className="space-y-1.5">
            <PropRow label="Color">
              <ColorInput value={el.shadowColor || "rgba(0,0,0,0.3)"} onChange={(v) => updateAndSave({ shadowColor: v })} />
            </PropRow>
            <PropRow label="Blur">
              <NumberInput value={el.shadowBlur || 0} onChange={(v) => updateAndSave({ shadowBlur: v })} min={0} max={100} />
            </PropRow>
            <PropRow label="X">
              <NumberInput value={el.shadowOffsetX || 0} onChange={(v) => updateAndSave({ shadowOffsetX: v })} />
            </PropRow>
            <PropRow label="Y">
              <NumberInput value={el.shadowOffsetY || 0} onChange={(v) => updateAndSave({ shadowOffsetY: v })} />
            </PropRow>
          </div>
        </div>

        {selectedIds.length === 1 && (
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase mb-2">Align on Canvas</h3>
            <div className="grid grid-cols-3 gap-1">
              <AlignBtn icon={<AlignStartHorizontal size={13} />} title="Align Left" onClick={() => updateAndSave({ x: 0 })} />
              <AlignBtn icon={<AlignHorizontalDistributeCenter size={13} />} title="Center H" onClick={() => updateAndSave({ x: (canvasSettings.width - el.width * el.scaleX) / 2 })} />
              <AlignBtn icon={<AlignEndHorizontal size={13} />} title="Align Right" onClick={() => updateAndSave({ x: canvasSettings.width - el.width * el.scaleX })} />
              <AlignBtn icon={<AlignStartVertical size={13} />} title="Align Top" onClick={() => updateAndSave({ y: 0 })} />
              <AlignBtn icon={<AlignVerticalDistributeCenter size={13} />} title="Center V" onClick={() => updateAndSave({ y: (canvasSettings.height - el.height * el.scaleY) / 2 })} />
              <AlignBtn icon={<AlignEndVertical size={13} />} title="Align Bottom" onClick={() => updateAndSave({ y: canvasSettings.height - el.height * el.scaleY })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-500 w-12 shrink-0">{label}</span>
      <div className="flex items-center gap-1 flex-1">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={min}
      max={max}
      step={step || 1}
      className="w-full bg-neutral-800 border border-neutral-700 rounded text-xs text-white px-2 py-1 focus:outline-none focus:border-blue-500"
    />
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1 flex-1">
      <input
        type="color"
        value={value.startsWith("#") ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded border border-neutral-700 cursor-pointer bg-transparent"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-white px-2 py-1 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

function StyleBtn({ icon, active, onClick }: { icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`p-1 rounded transition-colors ${active ? "bg-blue-600 text-white" : "text-neutral-400 hover:bg-neutral-700 hover:text-white"}`}
    >
      {icon}
    </button>
  );
}

function AlignBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors flex items-center justify-center"
    >
      {icon}
    </button>
  );
}
