import { useState } from "react";
import { useEditorStore } from "../store/editorStore";
import { TEMPLATES, TEMPLATE_CATEGORIES, CANVAS_PRESETS } from "../data/templates";
import { Search } from "lucide-react";

export default function TemplatesPanel() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const { loadProject } = useEditorStore();

  const filtered = TEMPLATES.filter((t) => {
    if (category !== "All" && t.category !== category) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    const elements = template.elements.map((el, i) => ({
      ...el,
      id: `el_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
    }));
    loadProject(elements, template.canvasSettings);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Templates</h3>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showPresets ? "Templates" : "Canvas Size"}
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded text-xs text-white pl-7 pr-3 py-1.5 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {showPresets ? (
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          <p className="text-xs text-neutral-400 mb-2">Choose a canvas size:</p>
          {Object.entries(CANVAS_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => {
                useEditorStore.getState().setCanvasSettings({
                  width: preset.width,
                  height: preset.height,
                });
                setShowPresets(false);
              }}
              className="w-full flex items-center justify-between p-2 rounded hover:bg-neutral-700 text-xs text-neutral-300 transition-colors"
            >
              <span>{preset.label}</span>
              <span className="text-neutral-500">{preset.width}x{preset.height}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="flex gap-1 px-3 pb-2 flex-wrap">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2 py-0.5 rounded-full text-xs transition-colors ${category === cat ? "bg-blue-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {filtered.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="w-full group"
              >
                <div className="rounded-lg overflow-hidden border border-neutral-700 hover:border-blue-500 transition-colors">
                  <div
                    className="aspect-video flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: template.canvasSettings.backgroundColor }}
                  >
                    <span style={{
                      color: isLightColor(template.canvasSettings.backgroundColor) ? "#333" : "#fff",
                      fontSize: "11px",
                      padding: "4px 8px",
                    }}>
                      {template.name}
                    </span>
                  </div>
                  <div className="bg-neutral-800 px-2 py-1.5 flex justify-between items-center">
                    <span className="text-xs text-neutral-300">{template.name}</span>
                    <span className="text-xs text-neutral-500">{template.category}</span>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-neutral-500 text-center py-8">No templates found</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
