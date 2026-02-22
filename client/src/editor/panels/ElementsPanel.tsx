import { useEditorStore, type ShapeType } from "../store/editorStore";
import { SHAPE_PRESETS } from "../data/templates";

const COLOR_PALETTES = [
  { name: "Vibrant", colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"] },
  { name: "Pastel", colors: ["#fca5a5", "#fdba74", "#fde047", "#86efac", "#93c5fd", "#c4b5fd", "#f9a8d4"] },
  { name: "Dark", colors: ["#991b1b", "#9a3412", "#854d0e", "#166534", "#1e3a8a", "#4c1d95", "#831843"] },
  { name: "Neutral", colors: ["#f5f5f4", "#d6d3d1", "#a8a29e", "#78716c", "#57534e", "#44403c", "#292524"] },
];

export default function ElementsPanel() {
  const { addElement } = useEditorStore();

  const addShape = (shapeType: ShapeType, fill?: string) => {
    const size = shapeType === "line" || shapeType === "arrow" ? { w: 200, h: 4 } : { w: 150, h: 150 };
    addElement({
      id: "",
      type: "shape",
      name: shapeType.charAt(0).toUpperCase() + shapeType.slice(1),
      x: 200,
      y: 200,
      width: size.w,
      height: size.h,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      shapeType,
      fill: fill || "#3b82f6",
      stroke: undefined,
      strokeWidth: 0,
      cornerRadius: shapeType === "rect" ? 0 : undefined,
    });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white mb-3">Shapes</h3>
        <div className="grid grid-cols-4 gap-2">
          {SHAPE_PRESETS.map((shape) => (
            <button
              key={shape.type}
              onClick={() => addShape(shape.type)}
              className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border border-neutral-700 hover:border-blue-500 hover:bg-neutral-800 transition-colors"
            >
              <span className="text-2xl">{shape.icon}</span>
              <span className="text-xs text-neutral-400">{shape.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-700 mt-1" />

      <div className="p-3">
        <h4 className="text-xs font-semibold text-neutral-400 mb-2">Quick Shapes with Colors</h4>
        {COLOR_PALETTES.map((palette) => (
          <div key={palette.name} className="mb-3">
            <p className="text-xs text-neutral-500 mb-1">{palette.name}</p>
            <div className="flex gap-1.5">
              {palette.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => addShape("rect", color)}
                  className="w-7 h-7 rounded border border-neutral-600 hover:border-white transition-colors hover:scale-110"
                  style={{ backgroundColor: color }}
                  title={`Add ${color} rectangle`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-700 mt-1" />

      <div className="p-3">
        <h4 className="text-xs font-semibold text-neutral-400 mb-2">Decorative Elements</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Gradient Box", fill: "#667eea", gradient: true },
            { label: "Outlined", fill: "transparent", stroke: true },
            { label: "Shadow Box", fill: "#ffffff", shadow: true },
            { label: "Pill Shape", fill: "#10b981", rounded: true },
            { label: "Circle", fill: "#f59e0b", circle: true },
            { label: "Divider", fill: "#d1d5db", line: true },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.circle) {
                  addShape("circle", item.fill);
                } else if (item.line) {
                  addShape("line", item.fill);
                } else {
                  addElement({
                    id: "",
                    type: "shape",
                    name: item.label,
                    x: 200, y: 200,
                    width: item.rounded ? 200 : 150,
                    height: item.rounded ? 50 : 100,
                    rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
                    shapeType: "rect",
                    fill: item.fill,
                    stroke: item.stroke ? "#333333" : undefined,
                    strokeWidth: item.stroke ? 2 : 0,
                    cornerRadius: item.rounded ? 25 : 0,
                    shadowColor: item.shadow ? "rgba(0,0,0,0.2)" : undefined,
                    shadowBlur: item.shadow ? 10 : undefined,
                    shadowOffsetY: item.shadow ? 4 : undefined,
                    gradientFill: item.gradient ? {
                      type: "linear",
                      stops: [{ offset: 0, color: "#667eea" }, { offset: 1, color: "#764ba2" }],
                    } : undefined,
                  });
                }
              }}
              className="p-2 rounded-lg border border-neutral-700 hover:border-blue-500 hover:bg-neutral-800 transition-colors text-xs text-neutral-300 text-center"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
