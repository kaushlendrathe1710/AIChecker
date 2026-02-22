import { useEditorStore } from "../store/editorStore";
import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Copy, Trash2, Type, Square, ImageIcon } from "lucide-react";

export default function LayersPanel() {
  const {
    elements, selectedIds, setSelectedIds,
    updateElement, removeElement, duplicateElements,
    moveElementOrder,
  } = useEditorStore();

  const reversedElements = [...elements].reverse();

  const getIcon = (type: string) => {
    switch (type) {
      case "text": return <Type size={12} />;
      case "shape": return <Square size={12} />;
      case "image": return <ImageIcon size={12} />;
      default: return <Square size={12} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white">Layers</h3>
        <p className="text-xs text-neutral-500 mt-0.5">{elements.length} element{elements.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {reversedElements.map((el) => {
          const isSelected = selectedIds.includes(el.id);
          return (
            <div
              key={el.id}
              onClick={() => setSelectedIds([el.id])}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors group ${
                isSelected ? "bg-blue-600/20 border border-blue-500/40" : "hover:bg-neutral-800 border border-transparent"
              }`}
            >
              <span className="text-neutral-500">{getIcon(el.type)}</span>
              <span className={`flex-1 text-xs truncate ${el.visible ? "text-neutral-200" : "text-neutral-500 line-through"}`}>
                {el.name}
              </span>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <LayerBtn
                  icon={el.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                  onClick={(e) => { e.stopPropagation(); updateElement(el.id, { visible: !el.visible }); }}
                  title={el.visible ? "Hide" : "Show"}
                />
                <LayerBtn
                  icon={el.locked ? <Lock size={11} /> : <Unlock size={11} />}
                  onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }); }}
                  title={el.locked ? "Unlock" : "Lock"}
                />
                <LayerBtn
                  icon={<ChevronUp size={11} />}
                  onClick={(e) => { e.stopPropagation(); moveElementOrder(el.id, "up"); }}
                  title="Move Up"
                />
                <LayerBtn
                  icon={<ChevronDown size={11} />}
                  onClick={(e) => { e.stopPropagation(); moveElementOrder(el.id, "down"); }}
                  title="Move Down"
                />
                <LayerBtn
                  icon={<Copy size={11} />}
                  onClick={(e) => { e.stopPropagation(); duplicateElements([el.id]); }}
                  title="Duplicate"
                />
                <LayerBtn
                  icon={<Trash2 size={11} />}
                  onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                  title="Delete"
                  className="hover:!text-red-400"
                />
              </div>
            </div>
          );
        })}

        {elements.length === 0 && (
          <p className="text-xs text-neutral-500 text-center py-8">
            No elements yet. Add text, shapes, or images to get started.
          </p>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="border-t border-neutral-700 p-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-400 flex-1">{selectedIds.length} selected</span>
            <button
              onClick={() => moveElementOrder(selectedIds[0], "top")}
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-700"
              title="Bring to Front"
            >
              <ChevronsUp size={14} />
            </button>
            <button
              onClick={() => moveElementOrder(selectedIds[0], "bottom")}
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-700"
              title="Send to Back"
            >
              <ChevronsDown size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LayerBtn({ icon, onClick, title, className }: {
  icon: React.ReactNode; onClick: (e: React.MouseEvent) => void; title: string; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-0.5 text-neutral-500 hover:text-white rounded transition-colors ${className || ""}`}
    >
      {icon}
    </button>
  );
}
