import { useState } from "react";
import { useEditorStore } from "../store/editorStore";
import { ANIMATION_PRESETS, ANIMATION_CATEGORIES } from "../data/animations";
import { Play, Trash2, Plus } from "lucide-react";

export default function AnimationsPanel() {
  const { elements, selectedIds, updateElement, pushHistory, setAnimationPlaying, setAnimationTime, animationDuration, setAnimationDuration } = useEditorStore();
  const [category, setCategory] = useState("All");

  const selectedElement = elements.find((el) => selectedIds.includes(el.id));

  const filtered = ANIMATION_PRESETS.filter((a) => {
    if (category !== "All" && a.category !== category) return false;
    return true;
  });

  const applyPreset = (preset: typeof ANIMATION_PRESETS[0]) => {
    if (!selectedElement) return;
    const baseKeyframes = preset.keyframes.map((kf) => ({
      ...kf,
      properties: { ...kf.properties },
    }));

    const existingX = selectedElement.x;
    const existingY = selectedElement.y;

    const adjustedKeyframes = baseKeyframes.map((kf) => ({
      ...kf,
      properties: {
        ...kf.properties,
        x: kf.properties.x !== undefined ? existingX + kf.properties.x : undefined,
        y: kf.properties.y !== undefined ? existingY + kf.properties.y : undefined,
      },
    }));

    updateElement(selectedElement.id, { keyframes: adjustedKeyframes });
    pushHistory();
  };

  const removeAnimation = () => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, { keyframes: undefined });
    pushHistory();
  };

  const addKeyframe = () => {
    if (!selectedElement) return;
    const currentKeyframes = selectedElement.keyframes || [];
    const lastTime = currentKeyframes.length > 0 ? currentKeyframes[currentKeyframes.length - 1].time : 0;
    const newKeyframe = {
      time: lastTime + 1,
      properties: {
        x: selectedElement.x,
        y: selectedElement.y,
        scaleX: selectedElement.scaleX,
        scaleY: selectedElement.scaleY,
        rotation: selectedElement.rotation,
        opacity: selectedElement.opacity,
      },
      easing: "easeInOut",
    };
    updateElement(selectedElement.id, { keyframes: [...currentKeyframes, newKeyframe] });
    pushHistory();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white mb-2">Animations</h3>

        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-neutral-400">Duration:</label>
          <input
            type="number"
            value={animationDuration}
            onChange={(e) => setAnimationDuration(Number(e.target.value))}
            min={1}
            max={60}
            step={0.5}
            className="w-16 bg-neutral-800 border border-neutral-700 rounded text-xs text-white px-2 py-1 focus:outline-none focus:border-blue-500"
          />
          <span className="text-xs text-neutral-500">sec</span>
          <button
            onClick={() => { setAnimationTime(0); setAnimationPlaying(true); }}
            className="ml-auto flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
          >
            <Play size={12} /> Preview
          </button>
        </div>

        {!selectedElement && (
          <p className="text-xs text-neutral-500 bg-neutral-800 rounded p-3 text-center">
            Select an element to add animations
          </p>
        )}

        {selectedElement && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-300">
                {selectedElement.name}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={addKeyframe}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-neutral-700 hover:bg-neutral-600 text-white rounded"
                >
                  <Plus size={10} /> Keyframe
                </button>
                {selectedElement.keyframes && selectedElement.keyframes.length > 0 && (
                  <button
                    onClick={removeAnimation}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-red-900/50 hover:bg-red-900 text-red-300 rounded"
                  >
                    <Trash2 size={10} /> Clear
                  </button>
                )}
              </div>
            </div>

            {selectedElement.keyframes && selectedElement.keyframes.length > 0 && (
              <div className="bg-neutral-800 rounded p-2 space-y-1">
                <p className="text-xs text-neutral-400 mb-1">{selectedElement.keyframes.length} keyframes</p>
                {selectedElement.keyframes.map((kf, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-neutral-300">
                    <span className="text-neutral-500 w-12">{kf.time.toFixed(1)}s</span>
                    <span className="flex-1 truncate text-neutral-400">
                      {Object.entries(kf.properties).map(([k, v]) => `${k}: ${typeof v === "number" ? v.toFixed(1) : v}`).join(", ")}
                    </span>
                    <span className="text-neutral-600">{kf.easing}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-700 mt-1" />

      <div className="p-3">
        <h4 className="text-xs font-semibold text-neutral-400 mb-2">Animation Presets</h4>
        <div className="flex gap-1 flex-wrap mb-2">
          {ANIMATION_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2 py-0.5 rounded-full text-xs ${category === cat ? "bg-blue-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {filtered.map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            disabled={!selectedElement}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-left ${
              selectedElement
                ? "border-neutral-700 hover:border-blue-500 hover:bg-neutral-800"
                : "border-neutral-800 opacity-40 cursor-not-allowed"
            }`}
          >
            <span className="text-lg w-6 text-center">{preset.icon}</span>
            <div className="flex-1">
              <p className="text-xs text-neutral-200">{preset.name}</p>
              <p className="text-xs text-neutral-500">{preset.duration}s - {preset.category}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
