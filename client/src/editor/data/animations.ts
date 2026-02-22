import type { Keyframe } from "../store/editorStore";

export interface AnimationPreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  keyframes: Keyframe[];
  duration: number;
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: "fade-in", name: "Fade In", category: "Entrance", icon: "◐",
    duration: 1,
    keyframes: [
      { time: 0, properties: { opacity: 0 }, easing: "easeOut" },
      { time: 1, properties: { opacity: 1 }, easing: "easeOut" },
    ],
  },
  {
    id: "fade-out", name: "Fade Out", category: "Exit", icon: "◑",
    duration: 1,
    keyframes: [
      { time: 0, properties: { opacity: 1 }, easing: "easeIn" },
      { time: 1, properties: { opacity: 0 }, easing: "easeIn" },
    ],
  },
  {
    id: "slide-left", name: "Slide Left", category: "Entrance", icon: "←",
    duration: 0.8,
    keyframes: [
      { time: 0, properties: { x: -300, opacity: 0 }, easing: "easeOut" },
      { time: 0.8, properties: { x: 0, opacity: 1 }, easing: "easeOut" },
    ],
  },
  {
    id: "slide-right", name: "Slide Right", category: "Entrance", icon: "→",
    duration: 0.8,
    keyframes: [
      { time: 0, properties: { x: 300, opacity: 0 }, easing: "easeOut" },
      { time: 0.8, properties: { x: 0, opacity: 1 }, easing: "easeOut" },
    ],
  },
  {
    id: "slide-up", name: "Slide Up", category: "Entrance", icon: "↑",
    duration: 0.8,
    keyframes: [
      { time: 0, properties: { y: 200, opacity: 0 }, easing: "easeOut" },
      { time: 0.8, properties: { y: 0, opacity: 1 }, easing: "easeOut" },
    ],
  },
  {
    id: "slide-down", name: "Slide Down", category: "Entrance", icon: "↓",
    duration: 0.8,
    keyframes: [
      { time: 0, properties: { y: -200, opacity: 0 }, easing: "easeOut" },
      { time: 0.8, properties: { y: 0, opacity: 1 }, easing: "easeOut" },
    ],
  },
  {
    id: "zoom-in", name: "Zoom In", category: "Entrance", icon: "⊕",
    duration: 0.6,
    keyframes: [
      { time: 0, properties: { scaleX: 0, scaleY: 0, opacity: 0 }, easing: "easeOut" },
      { time: 0.6, properties: { scaleX: 1, scaleY: 1, opacity: 1 }, easing: "easeOut" },
    ],
  },
  {
    id: "zoom-out", name: "Zoom Out", category: "Exit", icon: "⊖",
    duration: 0.6,
    keyframes: [
      { time: 0, properties: { scaleX: 1, scaleY: 1, opacity: 1 }, easing: "easeIn" },
      { time: 0.6, properties: { scaleX: 0, scaleY: 0, opacity: 0 }, easing: "easeIn" },
    ],
  },
  {
    id: "bounce-in", name: "Bounce In", category: "Entrance", icon: "⤴",
    duration: 1,
    keyframes: [
      { time: 0, properties: { scaleX: 0.3, scaleY: 0.3, opacity: 0 }, easing: "easeOut" },
      { time: 0.5, properties: { scaleX: 1.1, scaleY: 1.1, opacity: 1 }, easing: "easeOut" },
      { time: 0.7, properties: { scaleX: 0.9, scaleY: 0.9, opacity: 1 }, easing: "easeInOut" },
      { time: 1, properties: { scaleX: 1, scaleY: 1, opacity: 1 }, easing: "easeInOut" },
    ],
  },
  {
    id: "rotate-in", name: "Rotate In", category: "Entrance", icon: "↻",
    duration: 0.8,
    keyframes: [
      { time: 0, properties: { rotation: -180, opacity: 0 }, easing: "easeOut" },
      { time: 0.8, properties: { rotation: 0, opacity: 1 }, easing: "easeOut" },
    ],
  },
  {
    id: "spin", name: "Spin", category: "Emphasis", icon: "⟳",
    duration: 2,
    keyframes: [
      { time: 0, properties: { rotation: 0 }, easing: "linear" },
      { time: 2, properties: { rotation: 360 }, easing: "linear" },
    ],
  },
  {
    id: "pulse", name: "Pulse", category: "Emphasis", icon: "◉",
    duration: 1.5,
    keyframes: [
      { time: 0, properties: { scaleX: 1, scaleY: 1 }, easing: "easeInOut" },
      { time: 0.75, properties: { scaleX: 1.15, scaleY: 1.15 }, easing: "easeInOut" },
      { time: 1.5, properties: { scaleX: 1, scaleY: 1 }, easing: "easeInOut" },
    ],
  },
  {
    id: "shake", name: "Shake", category: "Emphasis", icon: "↔",
    duration: 0.5,
    keyframes: [
      { time: 0, properties: { x: 0 }, easing: "linear" },
      { time: 0.1, properties: { x: -10 }, easing: "linear" },
      { time: 0.2, properties: { x: 10 }, easing: "linear" },
      { time: 0.3, properties: { x: -10 }, easing: "linear" },
      { time: 0.4, properties: { x: 10 }, easing: "linear" },
      { time: 0.5, properties: { x: 0 }, easing: "linear" },
    ],
  },
  {
    id: "float", name: "Float", category: "Emphasis", icon: "≋",
    duration: 3,
    keyframes: [
      { time: 0, properties: { y: 0 }, easing: "easeInOut" },
      { time: 1.5, properties: { y: -20 }, easing: "easeInOut" },
      { time: 3, properties: { y: 0 }, easing: "easeInOut" },
    ],
  },
  {
    id: "typewriter", name: "Typewriter", category: "Entrance", icon: "⌨",
    duration: 1.5,
    keyframes: [
      { time: 0, properties: { opacity: 0 }, easing: "linear" },
      { time: 0.05, properties: { opacity: 1 }, easing: "linear" },
    ],
  },
];

export const ANIMATION_CATEGORIES = ["All", "Entrance", "Exit", "Emphasis"];

export function interpolateKeyframes(
  keyframes: Keyframe[],
  currentTime: number,
  baseProps: Record<string, number>
): Record<string, number> {
  if (!keyframes || keyframes.length === 0) return baseProps;

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  const result = { ...baseProps };

  if (currentTime <= sorted[0].time) {
    return { ...result, ...sorted[0].properties };
  }

  if (currentTime >= sorted[sorted.length - 1].time) {
    return { ...result, ...sorted[sorted.length - 1].properties };
  }

  let prevFrame = sorted[0];
  let nextFrame = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (currentTime >= sorted[i].time && currentTime <= sorted[i + 1].time) {
      prevFrame = sorted[i];
      nextFrame = sorted[i + 1];
      break;
    }
  }

  const duration = nextFrame.time - prevFrame.time;
  const elapsed = currentTime - prevFrame.time;
  let t = duration > 0 ? elapsed / duration : 1;

  t = applyEasing(t, nextFrame.easing);

  const allProps = new Set([
    ...Object.keys(prevFrame.properties),
    ...Object.keys(nextFrame.properties),
  ]);

  for (const prop of allProps) {
    const from = (prevFrame.properties as any)[prop] ?? (baseProps as any)[prop] ?? 0;
    const to = (nextFrame.properties as any)[prop] ?? from;
    (result as any)[prop] = from + (to - from) * t;
  }

  return result;
}

function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case "easeIn": return t * t;
    case "easeOut": return 1 - (1 - t) * (1 - t);
    case "easeInOut": return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case "linear":
    default: return t;
  }
}
