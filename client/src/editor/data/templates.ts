import type { EditorElement, CanvasSettings } from "../store/editorStore";

export interface Template {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  canvasSettings: CanvasSettings;
  elements: Omit<EditorElement, "id">[];
}

export const TEMPLATE_CATEGORIES = [
  "All",
  "Social Media",
  "Posters",
  "Brochures",
  "Presentations",
  "Video",
  "Stories",
  "Banners",
];

export const CANVAS_PRESETS: Record<string, { width: number; height: number; label: string }> = {
  "instagram-post": { width: 1080, height: 1080, label: "Instagram Post" },
  "instagram-story": { width: 1080, height: 1920, label: "Instagram Story" },
  "facebook-post": { width: 1200, height: 630, label: "Facebook Post" },
  "twitter-post": { width: 1200, height: 675, label: "Twitter Post" },
  "youtube-thumbnail": { width: 1280, height: 720, label: "YouTube Thumbnail" },
  "poster-a4": { width: 595, height: 842, label: "A4 Poster" },
  "poster-letter": { width: 612, height: 792, label: "Letter Poster" },
  "brochure": { width: 1224, height: 792, label: "Brochure (Trifold)" },
  "presentation": { width: 1920, height: 1080, label: "Presentation (16:9)" },
  "presentation-43": { width: 1024, height: 768, label: "Presentation (4:3)" },
  "video-landscape": { width: 1920, height: 1080, label: "Video (Landscape)" },
  "video-portrait": { width: 1080, height: 1920, label: "Video (Portrait)" },
  "video-square": { width: 1080, height: 1080, label: "Video (Square)" },
  "banner": { width: 1200, height: 300, label: "Web Banner" },
  "flyer": { width: 612, height: 792, label: "Flyer" },
  "business-card": { width: 504, height: 288, label: "Business Card" },
  "custom": { width: 800, height: 600, label: "Custom" },
};

export const TEMPLATES: Template[] = [
  {
    id: "social-gradient-1",
    name: "Bold Gradient",
    category: "Social Media",
    thumbnail: "gradient",
    canvasSettings: { width: 1080, height: 1080, backgroundColor: "#667eea", name: "Bold Gradient Post" },
    elements: [
      {
        type: "shape", name: "Background", x: 0, y: 0, width: 1080, height: 1080,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        shapeType: "rect", fill: "#667eea",
        gradientFill: { type: "linear", stops: [{ offset: 0, color: "#667eea" }, { offset: 1, color: "#764ba2" }] },
      },
      {
        type: "text", name: "Heading", x: 100, y: 350, width: 880, height: 120,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        text: "YOUR TEXT HERE", textStyle: {
          fontFamily: "Bebas Neue", fontSize: 80, fontStyle: "normal", fontWeight: "bold",
          textDecoration: "", align: "center", lineHeight: 1.2, letterSpacing: 4,
          fill: "#ffffff",
        },
      },
      {
        type: "text", name: "Subtitle", x: 200, y: 500, width: 680, height: 80,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.9, visible: true, locked: false,
        text: "Add your description here", textStyle: {
          fontFamily: "Inter", fontSize: 28, fontStyle: "normal", fontWeight: "normal",
          textDecoration: "", align: "center", lineHeight: 1.5, letterSpacing: 1,
          fill: "#e0e0ff",
        },
      },
    ],
  },
  {
    id: "social-minimal-1",
    name: "Clean Minimal",
    category: "Social Media",
    thumbnail: "minimal",
    canvasSettings: { width: 1080, height: 1080, backgroundColor: "#fafafa", name: "Minimal Post" },
    elements: [
      {
        type: "shape", name: "Accent Line", x: 440, y: 300, width: 200, height: 4,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        shapeType: "rect", fill: "#333333",
      },
      {
        type: "text", name: "Title", x: 140, y: 400, width: 800, height: 100,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        text: "MINIMAL DESIGN", textStyle: {
          fontFamily: "Montserrat", fontSize: 64, fontStyle: "normal", fontWeight: "bold",
          textDecoration: "", align: "center", lineHeight: 1.2, letterSpacing: 8,
          fill: "#222222",
        },
      },
      {
        type: "text", name: "Subtitle", x: 240, y: 530, width: 600, height: 60,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.7, visible: true, locked: false,
        text: "Less is more", textStyle: {
          fontFamily: "Inter", fontSize: 24, fontStyle: "italic", fontWeight: "normal",
          textDecoration: "", align: "center", lineHeight: 1.5, letterSpacing: 2,
          fill: "#666666",
        },
      },
    ],
  },
  {
    id: "poster-event-1",
    name: "Event Poster",
    category: "Posters",
    thumbnail: "event",
    canvasSettings: { width: 595, height: 842, backgroundColor: "#1a1a2e", name: "Event Poster" },
    elements: [
      {
        type: "shape", name: "Top Accent", x: 0, y: 0, width: 595, height: 200,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.8, visible: true, locked: false,
        shapeType: "rect",
        gradientFill: { type: "linear", stops: [{ offset: 0, color: "#e94560" }, { offset: 1, color: "#0f3460" }] },
      },
      {
        type: "text", name: "Event Name", x: 40, y: 250, width: 515, height: 120,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        text: "EVENT NAME", textStyle: {
          fontFamily: "Anton", fontSize: 72, fontStyle: "normal", fontWeight: "bold",
          textDecoration: "", align: "left", lineHeight: 1.1, letterSpacing: 3,
          fill: "#ffffff",
        },
      },
      {
        type: "text", name: "Date", x: 40, y: 420, width: 515, height: 50,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.8, visible: true, locked: false,
        text: "MARCH 15, 2026 — 7:00 PM", textStyle: {
          fontFamily: "Roboto", fontSize: 20, fontStyle: "normal", fontWeight: "normal",
          textDecoration: "", align: "left", lineHeight: 1.5, letterSpacing: 3,
          fill: "#e94560",
        },
      },
      {
        type: "text", name: "Location", x: 40, y: 480, width: 515, height: 50,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.6, visible: true, locked: false,
        text: "Convention Center, City", textStyle: {
          fontFamily: "Inter", fontSize: 18, fontStyle: "normal", fontWeight: "normal",
          textDecoration: "", align: "left", lineHeight: 1.5, letterSpacing: 1,
          fill: "#cccccc",
        },
      },
      {
        type: "shape", name: "CTA Button", x: 40, y: 680, width: 220, height: 50,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        shapeType: "rect", fill: "#e94560", cornerRadius: 25,
      },
      {
        type: "text", name: "CTA Text", x: 40, y: 692, width: 220, height: 30,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        text: "GET TICKETS", textStyle: {
          fontFamily: "Roboto", fontSize: 16, fontStyle: "normal", fontWeight: "bold",
          textDecoration: "", align: "center", lineHeight: 1.2, letterSpacing: 3,
          fill: "#ffffff",
        },
      },
    ],
  },
  {
    id: "presentation-modern-1",
    name: "Modern Deck",
    category: "Presentations",
    thumbnail: "deck",
    canvasSettings: { width: 1920, height: 1080, backgroundColor: "#0f172a", name: "Modern Presentation" },
    elements: [
      {
        type: "shape", name: "Side Bar", x: 0, y: 0, width: 100, height: 1080,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        shapeType: "rect",
        gradientFill: { type: "linear", stops: [{ offset: 0, color: "#3b82f6" }, { offset: 1, color: "#8b5cf6" }] },
      },
      {
        type: "text", name: "Title", x: 200, y: 300, width: 1400, height: 150,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        text: "PRESENTATION TITLE", textStyle: {
          fontFamily: "Montserrat", fontSize: 72, fontStyle: "normal", fontWeight: "bold",
          textDecoration: "", align: "left", lineHeight: 1.2, letterSpacing: 2,
          fill: "#f8fafc",
        },
      },
      {
        type: "text", name: "Subtitle", x: 200, y: 480, width: 1200, height: 60,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.7, visible: true, locked: false,
        text: "Your subtitle goes here — Company Name", textStyle: {
          fontFamily: "Inter", fontSize: 28, fontStyle: "normal", fontWeight: "normal",
          textDecoration: "", align: "left", lineHeight: 1.5, letterSpacing: 1,
          fill: "#94a3b8",
        },
      },
      {
        type: "shape", name: "Circle Accent", x: 1550, y: 750, width: 250, height: 250,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.3, visible: true, locked: false,
        shapeType: "circle", fill: "#3b82f6",
      },
    ],
  },
  {
    id: "story-vibrant-1",
    name: "Vibrant Story",
    category: "Stories",
    thumbnail: "vibrant",
    canvasSettings: { width: 1080, height: 1920, backgroundColor: "#ff6b6b", name: "Vibrant Story" },
    elements: [
      {
        type: "shape", name: "BG", x: 0, y: 0, width: 1080, height: 1920,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: true,
        shapeType: "rect",
        gradientFill: { type: "linear", stops: [{ offset: 0, color: "#ff6b6b" }, { offset: 0.5, color: "#feca57" }, { offset: 1, color: "#48dbfb" }] },
      },
      {
        type: "text", name: "Big Text", x: 100, y: 700, width: 880, height: 200,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        text: "WOW!", textStyle: {
          fontFamily: "Bungee", fontSize: 140, fontStyle: "normal", fontWeight: "bold",
          textDecoration: "", align: "center", lineHeight: 1.1, letterSpacing: 5,
          fill: "#ffffff", stroke: "#000000", strokeWidth: 3,
        },
      },
      {
        type: "text", name: "Sub", x: 200, y: 930, width: 680, height: 80,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.9, visible: true, locked: false,
        text: "Swipe up to learn more", textStyle: {
          fontFamily: "Poppins", fontSize: 28, fontStyle: "normal", fontWeight: "normal",
          textDecoration: "", align: "center", lineHeight: 1.5, letterSpacing: 1,
          fill: "#ffffff",
        },
      },
    ],
  },
  {
    id: "banner-promo-1",
    name: "Sale Banner",
    category: "Banners",
    thumbnail: "sale",
    canvasSettings: { width: 1200, height: 300, backgroundColor: "#111827", name: "Sale Banner" },
    elements: [
      {
        type: "shape", name: "Accent", x: 0, y: 0, width: 8, height: 300,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        shapeType: "rect", fill: "#ef4444",
      },
      {
        type: "text", name: "Sale", x: 40, y: 60, width: 500, height: 100,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        text: "MEGA SALE", textStyle: {
          fontFamily: "Anton", fontSize: 72, fontStyle: "normal", fontWeight: "bold",
          textDecoration: "", align: "left", lineHeight: 1.1, letterSpacing: 3,
          fill: "#ffffff",
        },
      },
      {
        type: "text", name: "Discount", x: 40, y: 170, width: 400, height: 50,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.8, visible: true, locked: false,
        text: "Up to 70% off everything", textStyle: {
          fontFamily: "Inter", fontSize: 22, fontStyle: "normal", fontWeight: "normal",
          textDecoration: "", align: "left", lineHeight: 1.5, letterSpacing: 1,
          fill: "#9ca3af",
        },
      },
      {
        type: "shape", name: "CTA", x: 880, y: 110, width: 260, height: 60,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        shapeType: "rect", fill: "#ef4444", cornerRadius: 8,
      },
      {
        type: "text", name: "CTA Text", x: 880, y: 122, width: 260, height: 40,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        text: "SHOP NOW", textStyle: {
          fontFamily: "Roboto", fontSize: 20, fontStyle: "normal", fontWeight: "bold",
          textDecoration: "", align: "center", lineHeight: 1.2, letterSpacing: 3,
          fill: "#ffffff",
        },
      },
    ],
  },
  {
    id: "brochure-business-1",
    name: "Business Brochure",
    category: "Brochures",
    thumbnail: "business",
    canvasSettings: { width: 1224, height: 792, backgroundColor: "#ffffff", name: "Business Brochure" },
    elements: [
      {
        type: "shape", name: "Header Bar", x: 0, y: 0, width: 1224, height: 120,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        shapeType: "rect", fill: "#1e3a5f",
      },
      {
        type: "text", name: "Company", x: 40, y: 35, width: 500, height: 60,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        text: "COMPANY NAME", textStyle: {
          fontFamily: "Montserrat", fontSize: 32, fontStyle: "normal", fontWeight: "bold",
          textDecoration: "", align: "left", lineHeight: 1.2, letterSpacing: 4,
          fill: "#ffffff",
        },
      },
      {
        type: "shape", name: "Divider 1", x: 408, y: 140, width: 2, height: 632,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.2, visible: true, locked: false,
        shapeType: "rect", fill: "#1e3a5f",
      },
      {
        type: "shape", name: "Divider 2", x: 816, y: 140, width: 2, height: 632,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.2, visible: true, locked: false,
        shapeType: "rect", fill: "#1e3a5f",
      },
      {
        type: "text", name: "Section 1", x: 40, y: 180, width: 340, height: 40,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        text: "About Us", textStyle: {
          fontFamily: "Montserrat", fontSize: 24, fontStyle: "normal", fontWeight: "bold",
          textDecoration: "", align: "left", lineHeight: 1.3, letterSpacing: 1,
          fill: "#1e3a5f",
        },
      },
      {
        type: "text", name: "Body 1", x: 40, y: 230, width: 340, height: 300,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.7, visible: true, locked: false,
        text: "Add your company description here. Tell your story and share what makes your business unique.", textStyle: {
          fontFamily: "Inter", fontSize: 14, fontStyle: "normal", fontWeight: "normal",
          textDecoration: "", align: "left", lineHeight: 1.7, letterSpacing: 0,
          fill: "#333333",
        },
      },
    ],
  },
  {
    id: "video-intro-1",
    name: "Video Intro",
    category: "Video",
    thumbnail: "video",
    canvasSettings: { width: 1920, height: 1080, backgroundColor: "#000000", name: "Video Intro" },
    elements: [
      {
        type: "shape", name: "BG", x: 0, y: 0, width: 1920, height: 1080,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: true,
        shapeType: "rect",
        gradientFill: { type: "radial", stops: [{ offset: 0, color: "#1a1a2e" }, { offset: 1, color: "#000000" }] },
      },
      {
        type: "text", name: "Logo Text", x: 460, y: 400, width: 1000, height: 120,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
        text: "YOUR BRAND", textStyle: {
          fontFamily: "Orbitron", fontSize: 80, fontStyle: "normal", fontWeight: "bold",
          textDecoration: "", align: "center", lineHeight: 1.2, letterSpacing: 10,
          fill: "#ffffff",
        },
        keyframes: [
          { time: 0, properties: { opacity: 0, scaleX: 0.5, scaleY: 0.5 }, easing: "easeOut" },
          { time: 1, properties: { opacity: 1, scaleX: 1, scaleY: 1 }, easing: "easeOut" },
          { time: 4, properties: { opacity: 1, scaleX: 1, scaleY: 1 }, easing: "linear" },
          { time: 5, properties: { opacity: 0, scaleX: 1.2, scaleY: 1.2 }, easing: "easeIn" },
        ],
      },
      {
        type: "text", name: "Tagline", x: 560, y: 540, width: 800, height: 60,
        rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.7, visible: true, locked: false,
        text: "Innovation Starts Here", textStyle: {
          fontFamily: "Inter", fontSize: 24, fontStyle: "normal", fontWeight: "normal",
          textDecoration: "", align: "center", lineHeight: 1.5, letterSpacing: 5,
          fill: "#888888",
        },
        keyframes: [
          { time: 0, properties: { opacity: 0, y: 580 }, easing: "easeOut" },
          { time: 1.5, properties: { opacity: 0.7, y: 540 }, easing: "easeOut" },
          { time: 4, properties: { opacity: 0.7, y: 540 }, easing: "linear" },
          { time: 5, properties: { opacity: 0 }, easing: "easeIn" },
        ],
      },
    ],
  },
];

export const SHAPE_PRESETS = [
  { type: "rect" as const, name: "Rectangle", icon: "□" },
  { type: "circle" as const, name: "Circle", icon: "○" },
  { type: "triangle" as const, name: "Triangle", icon: "△" },
  { type: "star" as const, name: "Star", icon: "☆" },
  { type: "hexagon" as const, name: "Hexagon", icon: "⬡" },
  { type: "line" as const, name: "Line", icon: "─" },
  { type: "arrow" as const, name: "Arrow", icon: "→" },
];
