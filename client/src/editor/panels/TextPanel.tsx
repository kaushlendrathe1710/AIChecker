import { useState } from "react";
import { useEditorStore } from "../store/editorStore";
import { FONT_LIST, FONT_CATEGORIES } from "../data/fonts";

const TEXT_PRESETS = [
  { label: "Heading", fontSize: 48, fontWeight: "bold", fontFamily: "Montserrat" },
  { label: "Subheading", fontSize: 32, fontWeight: "bold", fontFamily: "Inter" },
  { label: "Body Text", fontSize: 18, fontWeight: "normal", fontFamily: "Inter" },
  { label: "Caption", fontSize: 14, fontWeight: "normal", fontFamily: "Inter" },
  { label: "Display", fontSize: 72, fontWeight: "bold", fontFamily: "Bebas Neue" },
  { label: "Script", fontSize: 40, fontWeight: "normal", fontFamily: "Dancing Script" },
  { label: "Retro", fontSize: 36, fontWeight: "bold", fontFamily: "Permanent Marker" },
  { label: "Modern", fontSize: 28, fontWeight: "bold", fontFamily: "Poppins" },
];

export default function TextPanel() {
  const { addElement } = useEditorStore();
  const [fontSearch, setFontSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const addTextElement = (preset: typeof TEXT_PRESETS[0]) => {
    addElement({
      id: "",
      type: "text",
      name: preset.label,
      x: 100,
      y: 100,
      width: 400,
      height: preset.fontSize * 2,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      text: preset.label === "Heading" ? "Your Heading" :
            preset.label === "Subheading" ? "Your Subheading" :
            preset.label === "Body Text" ? "Start typing your body text here..." :
            preset.label === "Caption" ? "Caption text" :
            preset.label,
      textStyle: {
        fontFamily: preset.fontFamily,
        fontSize: preset.fontSize,
        fontStyle: "normal",
        fontWeight: preset.fontWeight,
        textDecoration: "",
        align: "left",
        lineHeight: 1.3,
        letterSpacing: 0,
        fill: "#000000",
      },
    });
  };

  const filteredFonts = FONT_LIST.filter((f) => {
    if (fontSearch && !f.toLowerCase().includes(fontSearch.toLowerCase())) return false;
    if (activeCategory) {
      return FONT_CATEGORIES[activeCategory]?.includes(f);
    }
    return true;
  });

  const addFontElement = (fontFamily: string) => {
    addElement({
      id: "",
      type: "text",
      name: fontFamily,
      x: 100,
      y: 100,
      width: 400,
      height: 60,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      text: `${fontFamily} Sample Text`,
      textStyle: {
        fontFamily,
        fontSize: 28,
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        align: "left",
        lineHeight: 1.3,
        letterSpacing: 0,
        fill: "#000000",
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white mb-3">Add Text</h3>
        <div className="space-y-1.5">
          {TEXT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => addTextElement(preset)}
              className="w-full text-left px-3 py-2 rounded-lg border border-neutral-700 hover:border-blue-500 hover:bg-neutral-800 transition-colors"
            >
              <span
                className="text-white block truncate"
                style={{
                  fontFamily: preset.fontFamily,
                  fontSize: `${Math.min(preset.fontSize / 3, 18)}px`,
                  fontWeight: preset.fontWeight,
                }}
              >
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-700 mt-1" />

      <div className="p-3">
        <h4 className="text-xs font-semibold text-neutral-400 mb-2">Font Library ({FONT_LIST.length}+ fonts)</h4>
        <input
          type="text"
          value={fontSearch}
          onChange={(e) => setFontSearch(e.target.value)}
          placeholder="Search fonts..."
          className="w-full bg-neutral-800 border border-neutral-700 rounded text-xs text-white px-3 py-1.5 mb-2 focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-1 flex-wrap mb-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-2 py-0.5 rounded-full text-xs ${!activeCategory ? "bg-blue-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
          >
            All
          </button>
          {Object.keys(FONT_CATEGORIES).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-2 py-0.5 rounded-full text-xs ${activeCategory === cat ? "bg-blue-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        {filteredFonts.map((font) => (
          <button
            key={font}
            onClick={() => addFontElement(font)}
            className="w-full text-left px-3 py-1.5 rounded hover:bg-neutral-700 transition-colors"
          >
            <span className="text-sm text-white" style={{ fontFamily: font }}>{font}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
