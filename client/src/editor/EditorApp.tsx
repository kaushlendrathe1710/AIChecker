import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "./store/editorStore";
import { loadGoogleFonts } from "./data/fonts";
import EditorToolbar from "./toolbar/EditorToolbar";
import CanvasStage from "./canvas/CanvasStage";
import PropertiesPanel from "./panels/PropertiesPanel";
import TemplatesPanel from "./panels/TemplatesPanel";
import TextPanel from "./panels/TextPanel";
import ElementsPanel from "./panels/ElementsPanel";
import UploadsPanel from "./panels/UploadsPanel";
import LayersPanel from "./panels/LayersPanel";
import AnimationsPanel from "./panels/AnimationsPanel";
import ExportDialog from "./panels/ExportDialog";
import { saveProject, loadSavedProject } from "./utils/export";
import { useState } from "react";
import { Download, Save, FolderOpen, Plus, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function EditorApp() {
  const {
    activePanelView, elements, canvasSettings,
    isAnimationPlaying, setAnimationPlaying, setAnimationTime, animationTime, animationDuration,
    loadProject, clearCanvas,
    undo, redo, copyElements, pasteElements, removeElements, selectedIds, duplicateElements,
  } = useEditorStore();

  const [showExport, setShowExport] = useState(false);
  const [, navigate] = useLocation();
  const animationRef = useRef<number>();

  useEffect(() => {
    loadGoogleFonts();
  }, []);

  useEffect(() => {
    if (!isAnimationPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;

      if (elapsed >= animationDuration) {
        setAnimationPlaying(false);
        setAnimationTime(0);
        return;
      }

      setAnimationTime(elapsed);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAnimationPlaying, animationDuration, setAnimationPlaying, setAnimationTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); redo(); }
      if (e.key === "c" && (e.ctrlKey || e.metaKey)) { copyElements(); }
      if (e.key === "v" && (e.ctrlKey || e.metaKey)) { pasteElements(); }
      if (e.key === "d" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); duplicateElements(selectedIds); }
      if (e.key === "Delete" || e.key === "Backspace") { if (selectedIds.length > 0) removeElements(selectedIds); }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, copyElements, pasteElements, removeElements, selectedIds, duplicateElements]);

  const handleSave = useCallback(() => {
    saveProject({
      elements,
      canvasSettings,
      savedAt: new Date().toISOString(),
    });
  }, [elements, canvasSettings]);

  const handleLoad = useCallback(() => {
    const data = loadSavedProject();
    if (data) {
      loadProject(data.elements || [], data.canvasSettings || canvasSettings);
    }
  }, [loadProject, canvasSettings]);

  const renderLeftPanel = () => {
    switch (activePanelView) {
      case "templates": return <TemplatesPanel />;
      case "text": return <TextPanel />;
      case "elements": return <ElementsPanel />;
      case "uploads": return <UploadsPanel />;
      case "layers": return <LayersPanel />;
      case "animations": return <AnimationsPanel />;
      default: return <TemplatesPanel />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-white overflow-hidden">
      <div className="bg-neutral-900 border-b border-neutral-700 flex items-center px-3 py-1.5 gap-2">
        <button onClick={() => navigate("/dashboard")} className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-700 transition-colors" title="Back to Dashboard">
          <ChevronLeft size={18} />
        </button>
        <div className="w-px h-5 bg-neutral-700" />
        <span className="text-sm font-semibold text-blue-400">Design Studio</span>
        <span className="text-xs text-neutral-500">|</span>
        <input
          type="text"
          value={canvasSettings.name}
          onChange={(e) => useEditorStore.getState().setCanvasSettings({ name: e.target.value })}
          className="bg-transparent text-sm text-neutral-300 border-none focus:outline-none focus:text-white min-w-0 flex-1"
        />
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={clearCanvas} className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors">
            <Plus size={13} /> New
          </button>
          <button onClick={handleLoad} className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors">
            <FolderOpen size={13} /> Load
          </button>
          <button onClick={handleSave} className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors">
            <Save size={13} /> Save
          </button>
          <button onClick={() => setShowExport(true)} className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      <EditorToolbar />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 bg-neutral-900 border-r border-neutral-700 overflow-hidden flex flex-col">
          {renderLeftPanel()}
        </div>

        <CanvasStage />

        <PropertiesPanel />
      </div>

      {isAnimationPlaying && (
        <div className="bg-neutral-900 border-t border-neutral-700 px-4 py-2 flex items-center gap-3">
          <span className="text-xs text-neutral-400">Animation:</span>
          <div className="flex-1 bg-neutral-800 rounded-full h-1.5 relative">
            <div
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{ width: `${(animationTime / animationDuration) * 100}%` }}
            />
          </div>
          <span className="text-xs text-neutral-400 font-mono w-20 text-right">
            {animationTime.toFixed(1)}s / {animationDuration}s
          </span>
          <button
            onClick={() => { setAnimationPlaying(false); setAnimationTime(0); }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Stop
          </button>
        </div>
      )}

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}
