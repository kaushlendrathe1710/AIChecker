import { create } from "zustand";

export type ElementType = "text" | "shape" | "image";
export type ShapeType = "rect" | "circle" | "triangle" | "star" | "line" | "arrow" | "polygon" | "hexagon";

export interface GradientStop {
  offset: number;
  color: string;
}

export interface GradientFill {
  type: "linear" | "radial";
  stops: GradientStop[];
  angle?: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontStyle: string;
  fontWeight: string;
  textDecoration: string;
  align: string;
  lineHeight: number;
  letterSpacing: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export interface Keyframe {
  time: number;
  properties: Partial<{
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    opacity: number;
  }>;
  easing: string;
}

export interface AnimationPreset {
  name: string;
  keyframes: Keyframe[];
}

export interface EditorElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  groupId?: string;

  fill?: string;
  gradientFill?: GradientFill;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;

  shapeType?: ShapeType;
  sides?: number;
  innerRadius?: number;

  text?: string;
  textStyle?: TextStyle;

  imageSrc?: string;
  imageFilters?: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
  };
  cropRect?: { x: number; y: number; width: number; height: number };

  keyframes?: Keyframe[];

  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export interface CanvasSettings {
  width: number;
  height: number;
  backgroundColor: string;
  name: string;
}

export interface HistoryEntry {
  elements: EditorElement[];
  canvasSettings: CanvasSettings;
}

export type ToolMode = "select" | "text" | "shape" | "draw" | "hand";
export type PanelView = "templates" | "elements" | "text" | "uploads" | "layers" | "animations";

interface EditorState {
  elements: EditorElement[];
  selectedIds: string[];
  canvasSettings: CanvasSettings;
  toolMode: ToolMode;
  activePanelView: PanelView;
  clipboardElements: EditorElement[];
  zoom: number;
  stagePosition: { x: number; y: number };

  history: HistoryEntry[];
  historyIndex: number;
  maxHistory: number;

  isAnimationPlaying: boolean;
  animationTime: number;
  animationDuration: number;

  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;

  addElement: (element: EditorElement) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  removeElement: (id: string) => void;
  removeElements: (ids: string[]) => void;
  setSelectedIds: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;
  moveElementOrder: (id: string, direction: "up" | "down" | "top" | "bottom") => void;

  setCanvasSettings: (settings: Partial<CanvasSettings>) => void;
  setToolMode: (mode: ToolMode) => void;
  setActivePanelView: (view: PanelView) => void;
  setZoom: (zoom: number) => void;
  setStagePosition: (pos: { x: number; y: number }) => void;

  copyElements: () => void;
  pasteElements: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  setAnimationPlaying: (playing: boolean) => void;
  setAnimationTime: (time: number) => void;
  setAnimationDuration: (duration: number) => void;

  toggleGrid: () => void;
  toggleSnap: () => void;

  loadProject: (elements: EditorElement[], settings: CanvasSettings) => void;
  clearCanvas: () => void;
}

const generateId = () => `el_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const DEFAULT_CANVAS: CanvasSettings = {
  width: 800,
  height: 600,
  backgroundColor: "#ffffff",
  name: "Untitled Design",
};

export const useEditorStore = create<EditorState>((set, get) => ({
  elements: [],
  selectedIds: [],
  canvasSettings: { ...DEFAULT_CANVAS },
  toolMode: "select",
  activePanelView: "templates",
  clipboardElements: [],
  zoom: 1,
  stagePosition: { x: 0, y: 0 },
  history: [{ elements: [], canvasSettings: { ...DEFAULT_CANVAS } }],
  historyIndex: 0,
  maxHistory: 50,
  isAnimationPlaying: false,
  animationTime: 0,
  animationDuration: 5,
  showGrid: false,
  snapToGrid: true,
  gridSize: 20,

  addElement: (element) => {
    set((state) => ({
      elements: [...state.elements, { ...element, id: element.id || generateId() }],
    }));
    get().pushHistory();
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    }));
  },

  removeElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    }));
    get().pushHistory();
  },

  removeElements: (ids) => {
    set((state) => ({
      elements: state.elements.filter((el) => !ids.includes(el.id)),
      selectedIds: [],
    }));
    get().pushHistory();
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  duplicateElements: (ids) => {
    const state = get();
    const newElements = state.elements
      .filter((el) => ids.includes(el.id))
      .map((el) => ({
        ...el,
        id: generateId(),
        x: el.x + 20,
        y: el.y + 20,
        name: `${el.name} copy`,
      }));
    set((s) => ({
      elements: [...s.elements, ...newElements],
      selectedIds: newElements.map((el) => el.id),
    }));
    get().pushHistory();
  },

  moveElementOrder: (id, direction) => {
    set((state) => {
      const idx = state.elements.findIndex((el) => el.id === id);
      if (idx === -1) return state;
      const newElements = [...state.elements];
      const el = newElements[idx];
      newElements.splice(idx, 1);
      switch (direction) {
        case "up":
          newElements.splice(Math.min(idx + 1, newElements.length), 0, el);
          break;
        case "down":
          newElements.splice(Math.max(idx - 1, 0), 0, el);
          break;
        case "top":
          newElements.push(el);
          break;
        case "bottom":
          newElements.unshift(el);
          break;
      }
      return { elements: newElements };
    });
    get().pushHistory();
  },

  setCanvasSettings: (settings) => {
    set((state) => ({
      canvasSettings: { ...state.canvasSettings, ...settings },
    }));
  },

  setToolMode: (mode) => set({ toolMode: mode }),
  setActivePanelView: (view) => set({ activePanelView: view }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setStagePosition: (pos) => set({ stagePosition: pos }),

  copyElements: () => {
    const state = get();
    const copied = state.elements.filter((el) => state.selectedIds.includes(el.id));
    set({ clipboardElements: copied });
  },

  pasteElements: () => {
    const state = get();
    if (state.clipboardElements.length === 0) return;
    const newElements = state.clipboardElements.map((el) => ({
      ...el,
      id: generateId(),
      x: el.x + 30,
      y: el.y + 30,
    }));
    set((s) => ({
      elements: [...s.elements, ...newElements],
      selectedIds: newElements.map((el) => el.id),
    }));
    get().pushHistory();
  },

  pushHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({
        elements: JSON.parse(JSON.stringify(state.elements)),
        canvasSettings: { ...state.canvasSettings },
      });
      if (newHistory.length > state.maxHistory) {
        newHistory.shift();
      }
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      return {
        historyIndex: newIndex,
        elements: JSON.parse(JSON.stringify(entry.elements)),
        canvasSettings: { ...entry.canvasSettings },
        selectedIds: [],
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      return {
        historyIndex: newIndex,
        elements: JSON.parse(JSON.stringify(entry.elements)),
        canvasSettings: { ...entry.canvasSettings },
        selectedIds: [],
      };
    });
  },

  setAnimationPlaying: (playing) => set({ isAnimationPlaying: playing }),
  setAnimationTime: (time) => set({ animationTime: time }),
  setAnimationDuration: (duration) => set({ animationDuration: duration }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

  loadProject: (elements, settings) => {
    set({
      elements,
      canvasSettings: settings,
      selectedIds: [],
      history: [{ elements: JSON.parse(JSON.stringify(elements)), canvasSettings: { ...settings } }],
      historyIndex: 0,
    });
  },

  clearCanvas: () => {
    set({
      elements: [],
      selectedIds: [],
      canvasSettings: { ...DEFAULT_CANVAS },
      history: [{ elements: [], canvasSettings: { ...DEFAULT_CANVAS } }],
      historyIndex: 0,
    });
  },
}));
