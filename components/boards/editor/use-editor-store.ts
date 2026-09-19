import { create } from "zustand";
import type { PresenceUser } from "@/shared/types";
import type { Tool, StrokeStyle, Sloppiness, Edges } from "./editor-types";

export interface EditorState {
  // Tools and styles
  activeTool: Tool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  sloppiness: Sloppiness;
  edges: Edges;
  opacity: number;
  isLocked: boolean;

  // Viewport & UI
  zoom: number;
  viewportLost: boolean;
  mobilePropertiesOpen: boolean;
  statusMessage: string;
  statusVisible: boolean;
  title: string;
  loading: boolean;
  hasSelectedObject: boolean;
  peers: Record<string, PresenceUser>;

  // Actions
  setActiveTool: (tool: Tool) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setStrokeStyle: (style: StrokeStyle) => void;
  setSloppiness: (slop: Sloppiness) => void;
  setEdges: (edges: Edges) => void;
  setOpacity: (opacity: number) => void;
  setIsLocked: (locked: boolean) => void;
  setZoom: (zoom: number) => void;
  setViewportLost: (lost: boolean) => void;
  setMobilePropertiesOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  flashStatus: (message: string) => void;
  setTitle: (title: string) => void;
  setLoading: (loading: boolean) => void;
  setHasSelectedObject: (has: boolean) => void;
  setPeers: (
    updater:
      | Record<string, PresenceUser>
      | ((prev: Record<string, PresenceUser>) => Record<string, PresenceUser>),
  ) => void;
  updateSelectedProperties: (props: {
    stroke?: string;
    fill?: string;
    strokeWidth?: number;
    opacity?: number;
    strokeStyle?: StrokeStyle;
    edges?: Edges;
  }) => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  activeTool: "select" as Tool,
  strokeColor: "#1e1e1e",
  fillColor: "transparent",
  strokeWidth: 2,
  strokeStyle: "solid" as StrokeStyle,
  sloppiness: "architect" as Sloppiness,
  edges: "round" as Edges,
  opacity: 100,
  isLocked: false,
  zoom: 1,
  viewportLost: false,
  mobilePropertiesOpen: false,
  statusMessage: "Starting board...",
  statusVisible: false,
  title: "Untitled board",
  loading: true,
  hasSelectedObject: false,
  peers: {},
};

let statusTimer: ReturnType<typeof setTimeout> | null = null;

export const useEditorStore = create<EditorState>((set) => ({
  ...DEFAULT_STATE,

  setActiveTool: (activeTool) => set({ activeTool }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setStrokeStyle: (strokeStyle) => set({ strokeStyle }),
  setSloppiness: (sloppiness) => set({ sloppiness }),
  setEdges: (edges) => set({ edges }),
  setOpacity: (opacity) => set({ opacity }),
  setIsLocked: (isLocked) => set({ isLocked }),
  setZoom: (zoom) => set({ zoom }),
  setViewportLost: (viewportLost) => set({ viewportLost }),
  setMobilePropertiesOpen: (val) =>
    set((state) => ({
      mobilePropertiesOpen:
        typeof val === "function" ? val(state.mobilePropertiesOpen) : val,
    })),
  flashStatus: (message: string) => {
    set({ statusMessage: message, statusVisible: true });
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      set({ statusVisible: false });
    }, 3000);
  },
  setTitle: (title) => set({ title }),
  setLoading: (loading) => set({ loading }),
  setHasSelectedObject: (hasSelectedObject) => set({ hasSelectedObject }),
  setPeers: (updater) =>
    set((state) => ({
      peers: typeof updater === "function" ? updater(state.peers) : updater,
    })),
  updateSelectedProperties: (props) =>
    set((state) => ({
      strokeColor: props.stroke ?? state.strokeColor,
      fillColor: props.fill ?? state.fillColor,
      strokeWidth: props.strokeWidth ?? state.strokeWidth,
      opacity: props.opacity ?? state.opacity,
      strokeStyle: props.strokeStyle ?? state.strokeStyle,
      edges: props.edges ?? state.edges,
    })),
  reset: () => set(DEFAULT_STATE),
}));
