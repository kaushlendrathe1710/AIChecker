import { useEditorStore } from "../store/editorStore";
import {
  MousePointer2, Type, Square, Hand, Undo2, Redo2, ZoomIn, ZoomOut,
  Grid3X3, Magnet, Download, Save, Play, Pause, Trash2, Copy, Clipboard,
  Layers, Image, LayoutTemplate, Sparkles,
} from "lucide-react";

export default function EditorToolbar() {
  const {
    toolMode, setToolMode, zoom, setZoom,
    undo, redo, historyIndex, history,
    selectedIds, removeElements, copyElements, pasteElements, duplicateElements,
    toggleGrid, showGrid, toggleSnap, snapToGrid,
    isAnimationPlaying, setAnimationPlaying, setAnimationTime,
    activePanelView, setActivePanelView,
  } = useEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="bg-neutral-900 border-b border-neutral-700 flex items-center gap-1 px-2 py-1.5 select-none">
      <div className="flex items-center gap-0.5 mr-2">
        <ToolBtn icon={<MousePointer2 size={16} />} active={toolMode === "select"} onClick={() => setToolMode("select")} title="Select (V)" />
        <ToolBtn icon={<Type size={16} />} active={toolMode === "text"} onClick={() => setToolMode("text")} title="Text (T)" />
        <ToolBtn icon={<Square size={16} />} active={toolMode === "shape"} onClick={() => setToolMode("shape")} title="Shape" />
        <ToolBtn icon={<Hand size={16} />} active={toolMode === "hand"} onClick={() => setToolMode("hand")} title="Pan (H)" />
      </div>

      <div className="w-px h-6 bg-neutral-700 mx-1" />

      <div className="flex items-center gap-0.5 mr-2">
        <ToolBtn icon={<Undo2 size={16} />} onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" />
        <ToolBtn icon={<Redo2 size={16} />} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" />
      </div>

      <div className="w-px h-6 bg-neutral-700 mx-1" />

      <div className="flex items-center gap-1 mr-2">
        <ToolBtn icon={<ZoomOut size={14} />} onClick={() => setZoom(zoom - 0.1)} title="Zoom Out" />
        <span className="text-xs text-neutral-300 w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
        <ToolBtn icon={<ZoomIn size={14} />} onClick={() => setZoom(zoom + 0.1)} title="Zoom In" />
      </div>

      <div className="w-px h-6 bg-neutral-700 mx-1" />

      <div className="flex items-center gap-0.5 mr-2">
        <ToolBtn icon={<Grid3X3 size={16} />} active={showGrid} onClick={toggleGrid} title="Toggle Grid" />
        <ToolBtn icon={<Magnet size={16} />} active={snapToGrid} onClick={toggleSnap} title="Toggle Snap" />
      </div>

      <div className="w-px h-6 bg-neutral-700 mx-1" />

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-0.5 mr-2">
          <ToolBtn icon={<Copy size={16} />} onClick={copyElements} title="Copy" />
          <ToolBtn icon={<Clipboard size={16} />} onClick={pasteElements} title="Paste" />
          <ToolBtn icon={<Layers size={16} />} onClick={() => duplicateElements(selectedIds)} title="Duplicate" />
          <ToolBtn icon={<Trash2 size={16} />} onClick={() => removeElements(selectedIds)} title="Delete" className="hover:!bg-red-900/50 hover:!text-red-400" />
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <ToolBtn
          icon={isAnimationPlaying ? <Pause size={16} /> : <Play size={16} />}
          onClick={() => {
            if (isAnimationPlaying) {
              setAnimationPlaying(false);
            } else {
              setAnimationTime(0);
              setAnimationPlaying(true);
            }
          }}
          title={isAnimationPlaying ? "Stop Animation" : "Play Animation"}
          active={isAnimationPlaying}
        />
      </div>

      <div className="w-px h-6 bg-neutral-700 mx-2" />

      <div className="flex items-center gap-0.5">
        <PanelBtn icon={<LayoutTemplate size={16} />} label="Templates" active={activePanelView === "templates"} onClick={() => setActivePanelView("templates")} />
        <PanelBtn icon={<Type size={16} />} label="Text" active={activePanelView === "text"} onClick={() => setActivePanelView("text")} />
        <PanelBtn icon={<Square size={16} />} label="Elements" active={activePanelView === "elements"} onClick={() => setActivePanelView("elements")} />
        <PanelBtn icon={<Image size={16} />} label="Uploads" active={activePanelView === "uploads"} onClick={() => setActivePanelView("uploads")} />
        <PanelBtn icon={<Layers size={16} />} label="Layers" active={activePanelView === "layers"} onClick={() => setActivePanelView("layers")} />
        <PanelBtn icon={<Sparkles size={16} />} label="Animate" active={activePanelView === "animations"} onClick={() => setActivePanelView("animations")} />
      </div>
    </div>
  );
}

function ToolBtn({ icon, active, onClick, disabled, title, className }: {
  icon: React.ReactNode; active?: boolean; onClick: () => void; disabled?: boolean; title: string; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${active ? "bg-blue-600 text-white" : "text-neutral-400 hover:bg-neutral-700 hover:text-white"} ${disabled ? "opacity-30 cursor-not-allowed" : ""} ${className || ""}`}
    >
      {icon}
    </button>
  );
}

function PanelBtn({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${active ? "bg-blue-600 text-white" : "text-neutral-400 hover:bg-neutral-700 hover:text-white"}`}
    >
      {icon}
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}
