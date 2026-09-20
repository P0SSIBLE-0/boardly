import type { Canvas, FabricObject } from "fabric";

export type FabricCanvas = Canvas;

export interface CanvasShapeObject extends FabricObject {
  __arrowHead?: FabricObject;
  __arrowShaft?: FabricObject;
  __isArrow?: boolean;
  __arrowLine?: FabricObject;
  isEditing?: boolean;
  rx?: number;
  ry?: number;
}

export type BoardMode = "guest" | "board";

export type Tool =
  | "select"
  | "draw"
  | "eraser"
  | "hand"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "arrow"
  | "line"
  | "text"
  | "image";

export type StrokeStyle = "solid" | "dashed" | "dotted";
export type Sloppiness = "architect" | "artist" | "cartoon";
export type Edges = "sharp" | "round";
export type LayerAction = "back" | "backward" | "forward" | "front";

export interface ShortcutItem {
  key: string;
  label: string;
}

export const SHORTCUTS: ShortcutItem[] = [
  { key: "V", label: "Select" },
  { key: "H", label: "Pan" },
  { key: "P", label: "Draw" },
  { key: "E", label: "Eraser" },
  { key: "R", label: "Rectangle" },
  { key: "O", label: "Ellipse" },
  { key: "D", label: "Diamond" },
  { key: "A", label: "Arrow" },
  { key: "L", label: "Line" },
  { key: "T", label: "Text" },
  { key: "9", label: "Image" },
  { key: "Del", label: "Delete" },
  { key: "Ctrl/Cmd Z", label: "Undo" },
  { key: "Ctrl/Cmd Shift Z", label: "Redo" },
  { key: "Space + Drag", label: "Pan" },
  { key: "Wheel", label: "Zoom" },
  { key: "Ctrl + / - / 0", label: "Zoom in / out / reset" },
];

export const GUEST_BOARD_TITLE = "Saved guest board";

export const STROKE_COLORS = [
  { hex: "#1e1e1e", label: "Dark" },
  { hex: "#e03131", label: "Red" },
  { hex: "#2f9e44", label: "Green" },
  { hex: "#1971c2", label: "Blue" },
  { hex: "#f08c00", label: "Orange" },
];

export const BG_COLORS = [
  { hex: "transparent", label: "Transparent", isChecker: true },
  { hex: "#e0e7ff", label: "Soft Lavender" },
  { hex: "#ffc9c9", label: "Soft Pink" },
  { hex: "#bbf7d0", label: "Soft Green" },
  { hex: "#fef08a", label: "Soft Yellow" },
];

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;

export const CURSORS = {
  crosshair: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 2v20M2 12h20' stroke='%23ffffff' stroke-width='3.5' stroke-linecap='round'/%3E%3Cpath d='M12 2v20M2 12h20' stroke='%230f172a' stroke-width='1.5' stroke-linecap='round'/%3E%3Ccircle cx='12' cy='12' r='1.5' fill='%230f172a'/%3E%3C/svg%3E") 12 12, crosshair`,
  eraser: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='8' stroke='%23ffffff' stroke-width='3'/%3E%3Ccircle cx='12' cy='12' r='8' stroke='%230f172a' stroke-width='1.5' fill='rgba(15, 23, 42, 0.15)'/%3E%3Ccircle cx='12' cy='12' r='1.2' fill='%230f172a'/%3E%3C/svg%3E") 12 12, crosshair`,
  text: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M7 4h10M12 4v16M7 20h10' stroke='%23ffffff' stroke-width='3.5' stroke-linecap='round'/%3E%3Cpath d='M7 4h10M12 4v16M7 20h10' stroke='%230f172a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, text`,
};

