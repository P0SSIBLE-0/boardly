"use client";

import { useEffect, useRef, useCallback } from "react";
import type { FabricObject, Point, TPointerEventInfo } from "fabric";
import type { BoardSnapshot } from "@/shared/types";
import {
  type Tool,
  type StrokeStyle,
  type Edges,
  type LayerAction,
  type FabricCanvas,
  type CanvasShapeObject,
  CURSORS,
} from "./editor-types";
import {
  renderCanvas,
  toViewportPoint,
  getCanvasCenter,
  getLiveZoom,
  applyZoomToCanvas,
  getCanvasPointer,
  setupMtrControl,
  removeObjectAndParts,
  eraseAtPointer,
  eraseAlongSegment,
  commitPendingErasures,
  cancelPendingErasures,
  drawEraserTrail,
  clearEraserTrail,
  createArrowPath,
  drawArrowPreview,
  type EraserTrailPoint,
  checkViewportLost,
  forEachActiveTarget,
} from "./canvas-utils";
import { useEditorStore } from "./use-editor-store";

interface UseCanvasManagerProps {
  canvasElementRef?: React.RefObject<HTMLCanvasElement | null>;
  canvasElement?: HTMLCanvasElement | null;
  initialSnapshot?: BoardSnapshot;
  onCanvasChange?: (snapshot: BoardSnapshot) => void;
}

export function useCanvasManager({
  canvasElementRef,
  canvasElement,
  initialSnapshot,
  onCanvasChange,
}: UseCanvasManagerProps) {
  const targetCanvasEl = canvasElement ?? canvasElementRef?.current ?? null;
  const initialSnapshotLoadedRef = useRef(false);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const fabricModuleRef = useRef<typeof import("fabric") | null>(null);
  const undoStackRef = useRef<BoardSnapshot[]>([]);
  const redoStackRef = useRef<BoardSnapshot[]>([]);
  const isDrawingShapeRef = useRef(false);
  const shapeStartPointRef = useRef({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const activeShapeRef = useRef<CanvasShapeObject | null>(null);
  const isPanningRef = useRef(false);
  const spaceDownRef = useRef(false);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const isErasingRef = useRef(false);
  const pendingErasuresRef = useRef<Set<CanvasShapeObject>>(new Set());
  const eraserTrailPointsRef = useRef<EraserTrailPoint[]>([]);
  const eraserFadeTimerRef = useRef<number | null>(null);
  const isLoadingSnapshotRef = useRef(false);
  const canvasReadyRef = useRef(false);

  // Store state and actions
  const activeTool = useEditorStore((s) => s.activeTool);
  const strokeColor = useEditorStore((s) => s.strokeColor);
  const fillColor = useEditorStore((s) => s.fillColor);
  const strokeWidth = useEditorStore((s) => s.strokeWidth);
  const strokeStyle = useEditorStore((s) => s.strokeStyle);
  const sloppiness = useEditorStore((s) => s.sloppiness);
  const edges = useEditorStore((s) => s.edges);
  const opacity = useEditorStore((s) => s.opacity);
  const isLocked = useEditorStore((s) => s.isLocked);
  const zoom = useEditorStore((s) => s.zoom);

  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setStrokeColor = useEditorStore((s) => s.setStrokeColor);
  const setFillColor = useEditorStore((s) => s.setFillColor);
  const setStrokeWidth = useEditorStore((s) => s.setStrokeWidth);
  const setStrokeStyle = useEditorStore((s) => s.setStrokeStyle);
  const setEdges = useEditorStore((s) => s.setEdges);
  const setOpacity = useEditorStore((s) => s.setOpacity);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setViewportLost = useEditorStore((s) => s.setViewportLost);
  const setHasSelectedObject = useEditorStore((s) => s.setHasSelectedObject);
  const updateSelectedProperties = useEditorStore((s) => s.updateSelectedProperties);
  const flashStatus = useEditorStore((s) => s.flashStatus);

  // Keep latest values in refs for canvas event callbacks
  const latestToolRef = useRef(activeTool);
  const latestStrokeColorRef = useRef(strokeColor);
  const latestFillColorRef = useRef(fillColor);
  const latestStrokeWidthRef = useRef(strokeWidth);
  const latestStrokeStyleRef = useRef(strokeStyle);
  const latestSloppinessRef = useRef(sloppiness);
  const latestEdgesRef = useRef(edges);
  const latestOpacityRef = useRef(opacity);
  const isLockedRef = useRef(isLocked);

  useEffect(() => {
    latestToolRef.current = activeTool;
  }, [activeTool]);
  useEffect(() => {
    latestStrokeColorRef.current = strokeColor;
  }, [strokeColor]);
  useEffect(() => {
    latestFillColorRef.current = fillColor;
  }, [fillColor]);
  useEffect(() => {
    latestStrokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);
  useEffect(() => {
    latestStrokeStyleRef.current = strokeStyle;
  }, [strokeStyle]);
  useEffect(() => {
    latestSloppinessRef.current = sloppiness;
  }, [sloppiness]);
  useEffect(() => {
    latestEdgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    latestOpacityRef.current = opacity;
  }, [opacity]);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const saveCanvasState = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingSnapshotRef.current) return;
    try {
      const json = canvas.toJSON() as BoardSnapshot;
      undoStackRef.current.push(json);
      if (undoStackRef.current.length > 100) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
    } catch {
      // ignore
    }
  }, []);

  const notifyChange = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingSnapshotRef.current || !onCanvasChange) return;
    try {
      const snapshot = canvas.toJSON() as BoardSnapshot;
      onCanvasChange(snapshot);
    } catch {
      // ignore
    }
  }, [onCanvasChange]);

  const loadSnapshotIntoCanvas = useCallback(
    async (snapshot: BoardSnapshot) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !snapshot) return;
      isLoadingSnapshotRef.current = true;
      try {
        await canvas.loadFromJSON(snapshot);
        renderCanvas(canvas);
      } catch (error) {
        console.error("Failed to load snapshot", error);
      } finally {
        isLoadingSnapshotRef.current = false;
      }
    },
    [],
  );

  const applyToolToCanvas = useCallback(
    (canvas: FabricCanvas, tool: Tool, color: string, width: number) => {
      const fabric = fabricModuleRef.current;
      if (!canvas || !fabric) return;

      if (tool === "draw") {
        if (!canvas.freeDrawingBrush) {
          const brush = new fabric.PencilBrush(canvas);
          brush.color = color;
          brush.width = width;
          canvas.freeDrawingBrush = brush;
        } else {
          canvas.freeDrawingBrush.color = color;
          canvas.freeDrawingBrush.width = width;
        }
      }

      switch (tool) {
        case "hand":
          canvas.isDrawingMode = false;
          canvas.selection = false;
          canvas.defaultCursor = "grab";
          canvas.hoverCursor = "grab";
          canvas.discardActiveObject();
          canvas.forEachObject((obj) => {
            obj.selectable = false;
            obj.evented = false;
          });
          renderCanvas(canvas);
          break;
        case "select":
          canvas.isDrawingMode = false;
          canvas.selection = true;
          canvas.defaultCursor = "default";
          canvas.hoverCursor = "move";
          canvas.forEachObject((obj) => {
            obj.selectable = true;
            obj.evented = true;
          });
          renderCanvas(canvas);
          break;
        case "draw":
          canvas.isDrawingMode = true;
          canvas.selection = false;
          canvas.defaultCursor = CURSORS.crosshair;
          canvas.hoverCursor = CURSORS.crosshair;
          canvas.freeDrawingCursor = CURSORS.crosshair;
          canvas.discardActiveObject();
          renderCanvas(canvas);
          break;
        case "rectangle":
        case "ellipse":
        case "diamond":
        case "arrow":
        case "line":
          canvas.isDrawingMode = false;
          canvas.selection = false;
          canvas.defaultCursor = CURSORS.crosshair;
          canvas.hoverCursor = CURSORS.crosshair;
          canvas.discardActiveObject();
          canvas.forEachObject((obj) => {
            obj.selectable = false;
            obj.evented = false;
          });
          renderCanvas(canvas);
          break;
        case "eraser":
          canvas.isDrawingMode = false;
          canvas.selection = false;
          canvas.defaultCursor = CURSORS.eraser;
          canvas.hoverCursor = CURSORS.eraser;
          canvas.discardActiveObject();
          canvas.forEachObject((obj) => {
            obj.selectable = false;
            obj.evented = true;
          });
          renderCanvas(canvas);
          break;
        default:
          cancelPendingErasures(canvas, pendingErasuresRef.current);
          clearEraserTrail(canvas);
          break;
        case "text":
        case "image":
          canvas.isDrawingMode = false;
          canvas.selection = true;
          canvas.defaultCursor = tool === "text" ? CURSORS.text : "default";
          canvas.hoverCursor = tool === "text" ? CURSORS.text : "move";
          canvas.forEachObject((obj) => {
            obj.selectable = true;
            obj.evented = true;
          });
          renderCanvas(canvas);
          break;
      }
    },
    [],
  );

  // Sync activeTool changes to canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReadyRef.current) return;
    applyToolToCanvas(
      canvas,
      activeTool,
      latestStrokeColorRef.current,
      latestStrokeWidthRef.current,
    );
  }, [activeTool, applyToolToCanvas]);

  // Sync brush colors & width
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas?.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    }
  }, [strokeColor, strokeWidth]);

  // Object selection sync
  const handleSelectObject = useCallback(
    (obj: FabricObject | null | undefined) => {
      if (!obj) {
        setHasSelectedObject(false);
        return;
      }
      obj.centeredRotation = true;
      if (obj.controls?.mtr) {
        setupMtrControl(obj.controls.mtr);
      }
      setHasSelectedObject(true);

      const target =
        "getObjects" in obj && typeof obj.getObjects === "function"
          ? (obj.getObjects()[0] as CanvasShapeObject) || (obj as CanvasShapeObject)
          : (obj as CanvasShapeObject);

      const props: Parameters<typeof updateSelectedProperties>[0] = {};
      if (target.stroke && typeof target.stroke === "string") {
        props.stroke = target.stroke;
      }
      if (target.fill && typeof target.fill === "string") {
        props.fill = target.fill;
      }
      if (typeof target.strokeWidth === "number") {
        props.strokeWidth = target.strokeWidth;
      }
      if (typeof target.opacity === "number") {
        props.opacity = Math.round(target.opacity * 100);
      }
      if (Array.isArray(target.strokeDashArray) && target.strokeDashArray.length > 0) {
        props.strokeStyle = target.strokeDashArray[0] > 3 ? "dashed" : "dotted";
      } else {
        props.strokeStyle = "solid";
      }
      if ((target.rx && target.rx > 0) || target.strokeLineJoin === "round") {
        props.edges = "round";
      } else {
        props.edges = "sharp";
      }
      updateSelectedProperties(props);
    },
    [setHasSelectedObject, updateSelectedProperties],
  );

  // Property updaters
  const updateStrokeColor = useCallback(
    (color: string) => {
      setStrokeColor(color);
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (canvas && active) {
        forEachActiveTarget(active, (obj) => {
          if (obj.type === "i-text" || obj.type === "text" || obj.type === "textbox") {
            obj.set({ fill: color, dirty: true });
          } else {
            const sw =
              typeof obj.strokeWidth === "number" && obj.strokeWidth > 0
                ? obj.strokeWidth
                : latestStrokeWidthRef.current || 2;
            obj.set({
              stroke: color,
              strokeWidth: sw,
              strokeUniform: true,
              dirty: true,
            });
          }
          if (obj.__arrowHead) {
            obj.__arrowHead.set({ stroke: color, fill: color, dirty: true });
          }
          obj.setCoords?.();
        });
        active.set?.("dirty", true);
        renderCanvas(canvas);
        saveCanvasState();
        notifyChange();
      }
    },
    [setStrokeColor, saveCanvasState, notifyChange],
  );

  const updateFillColor = useCallback(
    (color: string) => {
      setFillColor(color);
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (canvas && active) {
        forEachActiveTarget(active, (obj) => {
          if (
            obj.type !== "line" &&
            !obj.__isArrow &&
            obj.type !== "i-text" &&
            obj.type !== "text" &&
            obj.type !== "textbox"
          ) {
            obj.set({ fill: color, dirty: true });
          }
          obj.setCoords?.();
        });
        active.set?.("dirty", true);
        renderCanvas(canvas);
        saveCanvasState();
        notifyChange();
      }
    },
    [setFillColor, saveCanvasState, notifyChange],
  );

  const updateStrokeWidth = useCallback(
    (width: number) => {
      setStrokeWidth(width);
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (canvas && active) {
        forEachActiveTarget(active, (obj) => {
          if (obj.type !== "i-text" && obj.type !== "text" && obj.type !== "textbox") {
            obj.set({
              strokeWidth: width,
              stroke: obj.stroke || latestStrokeColorRef.current || "#1e1e1e",
              strokeUniform: true,
              dirty: true,
            });
          }
          obj.setCoords?.();
        });
        active.set?.("dirty", true);
        renderCanvas(canvas);
        saveCanvasState();
        notifyChange();
      }
    },
    [setStrokeWidth, saveCanvasState, notifyChange],
  );

  const updateStrokeStyle = useCallback(
    (style: StrokeStyle) => {
      setStrokeStyle(style);
      const dash = style === "dashed" ? [8, 8] : style === "dotted" ? [2, 6] : null;
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (canvas && active) {
        forEachActiveTarget(active, (obj) => {
          obj.set({ strokeDashArray: dash, dirty: true });
          obj.setCoords?.();
        });
        active.set?.("dirty", true);
        renderCanvas(canvas);
        saveCanvasState();
        notifyChange();
      }
    },
    [setStrokeStyle, saveCanvasState, notifyChange],
  );

  const updateEdges = useCallback(
    (edge: Edges) => {
      setEdges(edge);
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (canvas && active) {
        forEachActiveTarget(active, (obj) => {
          if (obj.type === "rect") {
            obj.set({ rx: edge === "round" ? 16 : 0, ry: edge === "round" ? 16 : 0, dirty: true });
          } else {
            obj.set({
              strokeLineJoin: edge === "round" ? "round" : "miter",
              strokeLineCap: edge === "round" ? "round" : "butt",
              dirty: true,
            });
          }
          obj.setCoords?.();
        });
        active.set?.("dirty", true);
        renderCanvas(canvas);
        saveCanvasState();
        notifyChange();
      }
    },
    [setEdges, saveCanvasState, notifyChange],
  );

  const updateOpacity = useCallback(
    (val: number) => {
      setOpacity(val);
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (canvas && active) {
        forEachActiveTarget(active, (obj) => {
          obj.set({ opacity: val / 100, dirty: true });
          obj.setCoords?.();
        });
        active.set?.("dirty", true);
        renderCanvas(canvas);
        saveCanvasState();
        notifyChange();
      }
    },
    [setOpacity, saveCanvasState, notifyChange],
  );

  const handleLayerAction = useCallback(
    (action: LayerAction) => {
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (!canvas || !active) return;
      try {
        if (action === "back") {
          if (typeof canvas.sendObjectToBack === "function") canvas.sendObjectToBack(active);
        } else if (action === "backward") {
          if (typeof canvas.sendObjectBackwards === "function") canvas.sendObjectBackwards(active);
        } else if (action === "forward") {
          if (typeof canvas.bringObjectForward === "function") canvas.bringObjectForward(active);
        } else if (action === "front") {
          if (typeof canvas.bringObjectToFront === "function") canvas.bringObjectToFront(active);
        }
        renderCanvas(canvas);
        saveCanvasState();
        notifyChange();
      } catch {
        // ignore
      }
    },
    [saveCanvasState, notifyChange],
  );

  const undo = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || undoStackRef.current.length <= 1) return;
    try {
      const current = canvas.toJSON() as BoardSnapshot;
      redoStackRef.current.push(current);
    } catch {
      // ignore
    }
    undoStackRef.current.pop();
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    if (prev) {
      void loadSnapshotIntoCanvas(prev);
      notifyChange();
    }
  }, [loadSnapshotIntoCanvas, notifyChange]);

  const redo = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;
    try {
      undoStackRef.current.push(canvas.toJSON() as BoardSnapshot);
    } catch {
      // ignore
    }
    const next = redoStackRef.current.pop();
    if (next) {
      void loadSnapshotIntoCanvas(next);
      notifyChange();
    }
  }, [loadSnapshotIntoCanvas, notifyChange]);

  const handleDeleteSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const targets: CanvasShapeObject[] = [];
    try {
      if (typeof canvas.getActiveObjects === "function") {
        targets.push(...(canvas.getActiveObjects() as CanvasShapeObject[]));
      } else if (typeof canvas.getActiveObject === "function") {
        const single = canvas.getActiveObject();
        if (single) targets.push(single as CanvasShapeObject);
      }
    } catch {
      return;
    }

    if (targets.length === 0) return;
    if (targets.some((obj) => obj.isEditing)) return;

    targets.forEach((obj) => removeObjectAndParts(canvas, obj));
    saveCanvasState();
    notifyChange();
    renderCanvas(canvas);
    flashStatus(targets.length > 1 ? `${targets.length} objects deleted.` : "Deleted.");
  }, [saveCanvasState, notifyChange, flashStatus]);

  const handleClearCanvas = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (canvas.getObjects().length === 0) {
      flashStatus("Canvas is already empty.");
      return;
    }
    try {
      canvas.clear();
      canvas.backgroundColor = "#f8fafc";
      renderCanvas(canvas);
    } catch {
      // ignore
    }
    saveCanvasState();
    notifyChange();
    flashStatus("Canvas cleared.");
  }, [saveCanvasState, notifyChange, flashStatus]);

  const handleZoomIn = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;
    const next = applyZoomToCanvas(fabric, canvas, getLiveZoom(canvas, zoom) * 1.2);
    setZoom(next);
    setViewportLost(checkViewportLost(canvas));
    renderCanvas(canvas);
  }, [zoom, setZoom, setViewportLost]);

  const handleZoomOut = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;
    const next = applyZoomToCanvas(fabric, canvas, getLiveZoom(canvas, zoom) / 1.2);
    setZoom(next);
    setViewportLost(checkViewportLost(canvas));
    renderCanvas(canvas);
  }, [zoom, setZoom, setViewportLost]);

  const handleResetZoom = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;
    try {
      canvas.setViewportTransform?.([1, 0, 0, 1, 0, 0]);
    } catch {
      // ignore
    }
    const next = applyZoomToCanvas(fabric, canvas, 1);
    setZoom(next);
    setViewportLost(checkViewportLost(canvas));
    renderCanvas(canvas);
  }, [setZoom, setViewportLost]);

  const handleRecenter = useCallback(() => {
    handleResetZoom();
    flashStatus("Canvas centered.");
  }, [handleResetZoom, flashStatus]);

  const handleAddImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const canvas = fabricCanvasRef.current;
      const fabric = fabricModuleRef.current;
      if (!canvas || !fabric) return;

      setActiveTool("select");
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const fabricImage = new fabric.FabricImage(img, {
              left: 100,
              top: 100,
              scaleX: 0.5,
              scaleY: 0.5,
              centeredRotation: true,
            });
            canvas.add(fabricImage);
            canvas.setActiveObject(fabricImage);
            applyToolToCanvas(
              canvas,
              "select",
              latestStrokeColorRef.current,
              latestStrokeWidthRef.current,
            );
            saveCanvasState();
            notifyChange();
          } catch (error) {
            console.error("Failed to add image", error);
            flashStatus("Could not add image.");
          }
        };
        img.onerror = () => flashStatus("Could not load image.");
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [setActiveTool, applyToolToCanvas, saveCanvasState, notifyChange, flashStatus]);

  const handleExportPng = useCallback(
    (boardTitle: string) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      if (canvas.getObjects().length === 0) {
        flashStatus("Add something to the board before exporting.");
        return;
      }
      try {
        const dataURL = canvas.toDataURL({ format: "png", multiplier: 2 });
        const anchor = document.createElement("a");
        anchor.href = dataURL;
        anchor.download = `${(boardTitle || "board").replace(/\s+/g, "-").toLowerCase()}.png`;
        anchor.click();
        flashStatus("PNG exported.");
      } catch {
        flashStatus("Export failed.");
      }
    },
    [flashStatus],
  );

  const handleExportSvg = useCallback(
    (boardTitle: string) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      try {
        const svg = canvas.toSVG();
        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${(boardTitle || "board").replace(/\s+/g, "-").toLowerCase()}.svg`;
        anchor.click();
        URL.revokeObjectURL(url);
        flashStatus("SVG exported.");
      } catch {
        flashStatus("Export failed.");
      }
    },
    [flashStatus],
  );

  // Initialize Canvas
  useEffect(() => {
    let cancelled = false;
    let canvasInstance: FabricCanvas | null = null;
    let resizeHandler: (() => void) | null = null;
    let scrollHandler: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;

    async function init() {
      if (!targetCanvasEl) return;

      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      if (cancelled || !targetCanvasEl) return;

      const fabric = await import("fabric");
      if (cancelled || !targetCanvasEl) return;

      fabricModuleRef.current = fabric;
      const { Canvas, PencilBrush, Rect, Ellipse, Line, Polygon, IText, Path } = fabric;

      const workspaceContainer = targetCanvasEl.parentElement;
      const containerWidth = Math.max(320, workspaceContainer?.clientWidth || window.innerWidth);
      const containerHeight = Math.max(320, workspaceContainer?.clientHeight || window.innerHeight);

      const canvas = new Canvas(targetCanvasEl, {
        width: containerWidth,
        height: containerHeight,
        backgroundColor: "#f8fafc",
        selection: true,
        stopContextMenu: true,
        enableRetinaScaling: true,
      });

      if (cancelled) {
        try {
          canvas.dispose();
        } catch {
          // ignore
        }
        return;
      }

      const brush = new PencilBrush(canvas);
      brush.color = latestStrokeColorRef.current;
      brush.width = latestStrokeWidthRef.current;
      canvas.freeDrawingBrush = brush;
      canvas.freeDrawingCursor = CURSORS.crosshair;

      canvasInstance = canvas;
      fabricCanvasRef.current = canvas;
      canvasReadyRef.current = true;

      // Style object controls globally
      const objProto = fabric.FabricObject?.prototype;
      if (objProto) {
        objProto.originX = "left";
        objProto.originY = "top";
        objProto.transparentCorners = false;
        objProto.cornerColor = "#ffffff";
        objProto.cornerStrokeColor = "#5e6ad2";
        objProto.borderColor = "#828fff";
        objProto.cornerSize = 8;
        objProto.cornerStyle = "rect";
        objProto.borderScaleFactor = 1.5;
        objProto.centeredRotation = true;
        if (objProto.controls?.mtr) {
          setupMtrControl(objProto.controls.mtr);
        }
      }

      canvas.selectionColor = "rgba(94, 106, 210, 0.08)";
      canvas.selectionBorderColor = "#5e6ad2";
      canvas.selectionLineWidth = 1;

      // Selection listeners
      canvas.on("selection:created", () => {
        handleSelectObject(canvas.getActiveObject());
      });
      canvas.on("selection:updated", () => {
        handleSelectObject(canvas.getActiveObject());
      });
      canvas.on("selection:cleared", () => {
        handleSelectObject(null);
      });

      applyToolToCanvas(
        canvas,
        latestToolRef.current,
        latestStrokeColorRef.current,
        latestStrokeWidthRef.current,
      );

      if (initialSnapshot && !initialSnapshotLoadedRef.current) {
        initialSnapshotLoadedRef.current = true;
        await loadSnapshotIntoCanvas(initialSnapshot);
        if (!cancelled) saveCanvasState();
      } else if (!cancelled) {
        saveCanvasState();
      }

      const sizeCanvas = () => {
        if (!workspaceContainer || !canvasInstance || cancelled) return;
        const w = Math.max(320, workspaceContainer.clientWidth || window.innerWidth);
        const h = Math.max(320, workspaceContainer.clientHeight || window.innerHeight);
        try {
          canvasInstance.setDimensions({ width: w, height: h });
          canvasInstance.calcOffset();
          renderCanvas(canvasInstance);
        } catch {
          // ignore
        }
      };

      // Force immediate sizing and offset calculation
      sizeCanvas();
      try {
        canvas.calcOffset();
      } catch {
        // ignore
      }

      resizeHandler = sizeCanvas;
      window.addEventListener("resize", resizeHandler);
      const onScroll = () => {
        try {
          canvasInstance?.calcOffset();
        } catch {
          // ignore
        }
      };
      scrollHandler = onScroll;
      window.addEventListener("scroll", onScroll, { passive: true });
      if (typeof ResizeObserver !== "undefined" && workspaceContainer) {
        resizeObserver = new ResizeObserver(() => sizeCanvas());
        resizeObserver.observe(workspaceContainer);
      }

      canvas.on("object:added", (e) => {
        if (cancelled || isLoadingSnapshotRef.current) return;
        if (e.target) {
          e.target.centeredRotation = true;
          if (e.target.controls?.mtr) {
            setupMtrControl(e.target.controls.mtr);
          }
          if (latestToolRef.current === "select") {
            e.target.selectable = true;
            e.target.evented = true;
          }
        }
        if (canvas.isDrawingMode || isDrawingShapeRef.current) return;
        saveCanvasState();
        notifyChange();
      });

      canvas.on("object:modified", () => {
        if (cancelled || isLoadingSnapshotRef.current) return;
        saveCanvasState();
        notifyChange();
      });
      canvas.on("object:removed", () => {
        if (cancelled || isLoadingSnapshotRef.current) return;
        saveCanvasState();
        notifyChange();
      });
      canvas.on("path:created", (e: unknown) => {
        if (cancelled || isLoadingSnapshotRef.current) return;
        const pathObj = (e as { path?: FabricObject })?.path;
        if (pathObj) {
          pathObj.centeredRotation = true;
          if (pathObj.controls?.mtr) {
            setupMtrControl(pathObj.controls.mtr);
          }
        }
        saveCanvasState();
        notifyChange();
      });

      canvas.on("mouse:down", (opt: TPointerEventInfo) => {
        try {
          canvas.calcOffset();
        } catch {
          // ignore
        }
        const tool = latestToolRef.current;
        if (tool === "select" || tool === "draw" || tool === "image" || tool === "hand") return;

        if (tool === "eraser") {
          const pointer = getCanvasPointer(canvas, opt);
          isErasingRef.current = true;
          pendingErasuresRef.current.clear();
          const pt = { x: pointer.x, y: pointer.y, time: Date.now() };
          eraserTrailPointsRef.current = [pt];
          eraseAtPointer(canvas, pointer, pendingErasuresRef.current, opt.e, isLoadingSnapshotRef.current);
          drawEraserTrail(canvas, eraserTrailPointsRef.current);
          return;
        }

        if (tool === "text") {
          const pointer = getCanvasPointer(canvas, opt);
          const text = new IText("Type here", {
            originX: "left",
            originY: "top",
            left: pointer.x,
            top: pointer.y,
            fontSize: 20,
            fill: latestStrokeColorRef.current,
            fontFamily: "Inter, sans-serif",
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          try {
            text.enterEditing();
            text.selectAll();
          } catch {
            // ignore
          }
          saveCanvasState();
          notifyChange();
          return;
        }

        const pointer = getCanvasPointer(canvas, opt);
        isDrawingShapeRef.current = true;
        shapeStartPointRef.current = { x: pointer.x, y: pointer.y };
        lastPointerRef.current = { x: pointer.x, y: pointer.y };

        const color = latestStrokeColorRef.current;
        const width = latestStrokeWidthRef.current;
        const fill = latestFillColorRef.current ?? "transparent";
        const dash =
          latestStrokeStyleRef.current === "dashed"
            ? [8, 8]
            : latestStrokeStyleRef.current === "dotted"
              ? [2, 6]
              : null;
        const isRound = latestEdgesRef.current === "round";
        const op = latestOpacityRef.current / 100;

        if (tool === "arrow") {
          activeShapeRef.current = null;
          drawArrowPreview(canvas, pointer, pointer, {
            stroke: color,
            strokeWidth: width,
            strokeDashArray: dash,
            strokeLineCap: isRound ? "round" : "butt",
            opacity: op,
          });
          return;
        }

        if (tool === "rectangle") {
          const rect = new Rect({
            originX: "left",
            originY: "top",
            left: pointer.x,
            top: pointer.y,
            width: 1,
            height: 1,
            fill,
            stroke: color,
            strokeWidth: width,
            strokeDashArray: dash,
            strokeUniform: true,
            rx: isRound ? 16 : 0,
            ry: isRound ? 16 : 0,
            opacity: op,
            selectable: false,
            evented: false,
            centeredRotation: true,
          });
          canvas.add(rect);
          activeShapeRef.current = rect as CanvasShapeObject;
        } else if (tool === "ellipse") {
          const ellipse = new Ellipse({
            originX: "left",
            originY: "top",
            left: pointer.x,
            top: pointer.y,
            rx: 0.5,
            ry: 0.5,
            fill,
            stroke: color,
            strokeWidth: width,
            strokeDashArray: dash,
            strokeUniform: true,
            opacity: op,
            selectable: false,
            evented: false,
            centeredRotation: true,
          });
          canvas.add(ellipse);
          activeShapeRef.current = ellipse as CanvasShapeObject;
        } else if (tool === "line") {
          const line = new Line([pointer.x, pointer.y, pointer.x + 1, pointer.y + 1], {
            originX: "left",
            originY: "top",
            stroke: color,
            strokeWidth: width,
            strokeDashArray: dash,
            strokeUniform: true,
            strokeLineCap: isRound ? "round" : "butt",
            opacity: op,
            selectable: false,
            evented: false,
            centeredRotation: true,
          });
          canvas.add(line);
          activeShapeRef.current = line as CanvasShapeObject;
        } else if (tool === "diamond") {
          const diamond = new Polygon(
            [
              { x: 50, y: 0 },
              { x: 100, y: 50 },
              { x: 50, y: 100 },
              { x: 0, y: 50 },
            ],
            {
              originX: "left",
              originY: "top",
              left: pointer.x,
              top: pointer.y,
              fill,
              stroke: color,
              strokeWidth: width,
              strokeDashArray: dash,
              strokeUniform: true,
              strokeLineJoin: isRound ? "round" : "miter",
              strokeLineCap: isRound ? "round" : "butt",
              opacity: op,
              selectable: false,
              evented: false,
              scaleX: 0.001,
              scaleY: 0.001,
              centeredRotation: true,
            },
          );
          canvas.add(diamond);
          activeShapeRef.current = diamond as CanvasShapeObject;
        }
      });

      canvas.on("mouse:move", (opt: TPointerEventInfo) => {
        if (isErasingRef.current) {
          const pointer = getCanvasPointer(canvas, opt);
          const points = eraserTrailPointsRef.current;
          const prevPointer = points.length > 0 ? points[points.length - 1] : pointer;
          const now = Date.now();

          // Keep only points from the last 200ms and max 10 points for a compact, short trailing tail
          const trimmed = points.filter((p) => now - (p.time ?? 0) < 200).slice(-9);
          trimmed.push({ x: pointer.x, y: pointer.y, time: now });
          eraserTrailPointsRef.current = trimmed;

          eraseAlongSegment(canvas, prevPointer, pointer, pendingErasuresRef.current, opt.e, isLoadingSnapshotRef.current);
          drawEraserTrail(canvas, trimmed);

          // If the user pauses dragging, auto-vanish the remaining trail
          if (eraserFadeTimerRef.current) {
            window.clearTimeout(eraserFadeTimerRef.current);
          }
          eraserFadeTimerRef.current = window.setTimeout(() => {
            if (isErasingRef.current && fabricCanvasRef.current) {
              eraserTrailPointsRef.current = [];
              clearEraserTrail(fabricCanvasRef.current);
            }
          }, 180);

          return;
        }

        if (!isDrawingShapeRef.current) return;

        const pointer = getCanvasPointer(canvas, opt);
        lastPointerRef.current = pointer;
        const start = shapeStartPointRef.current;

        if (latestToolRef.current === "arrow") {
          drawArrowPreview(canvas, start, pointer, {
            stroke: latestStrokeColorRef.current || "#1e1e1e",
            strokeWidth: latestStrokeWidthRef.current || 2,
            strokeDashArray:
              latestStrokeStyleRef.current === "dashed"
                ? [8, 8]
                : latestStrokeStyleRef.current === "dotted"
                  ? [2, 6]
                  : null,
            strokeLineCap: latestEdgesRef.current === "round" ? "round" : "butt",
            opacity: latestOpacityRef.current / 100,
          });
          return;
        }

        if (!activeShapeRef.current) return;
        const shape = activeShapeRef.current;

        if (latestToolRef.current === "rectangle") {
          const w = Math.max(1, Math.abs(pointer.x - start.x));
          const h = Math.max(1, Math.abs(pointer.y - start.y));
          const left = Math.min(pointer.x, start.x);
          const top = Math.min(pointer.y, start.y);
          shape.set({ originX: "left", originY: "top", left, top, width: w, height: h });
        } else if (latestToolRef.current === "ellipse") {
          const w = Math.max(1, Math.abs(pointer.x - start.x));
          const h = Math.max(1, Math.abs(pointer.y - start.y));
          const left = Math.min(pointer.x, start.x);
          const top = Math.min(pointer.y, start.y);
          shape.set({ originX: "left", originY: "top", left, top, rx: w / 2, ry: h / 2 });
        } else if (latestToolRef.current === "line") {
          shape.set({ x2: pointer.x, y2: pointer.y } as { x2: number; y2: number });
        } else if (latestToolRef.current === "diamond") {
          const w = Math.max(1, Math.abs(pointer.x - start.x));
          const h = Math.max(1, Math.abs(pointer.y - start.y));
          shape.set({
            originX: "left",
            originY: "top",
            left: Math.min(pointer.x, start.x),
            top: Math.min(pointer.y, start.y),
            scaleX: Math.max(0.001, w / 100),
            scaleY: Math.max(0.001, h / 100),
          });
        }

        shape.setCoords?.();
        renderCanvas(canvas);
      });

      const finishShape = () => {
        if (isPanningRef.current) {
          isPanningRef.current = false;
          applyToolToCanvas(
            canvas,
            latestToolRef.current,
            latestStrokeColorRef.current,
            latestStrokeWidthRef.current,
          );
          setViewportLost(checkViewportLost(canvas));
          return;
        }

        if (isErasingRef.current) {
          isErasingRef.current = false;
          eraserTrailPointsRef.current = [];
          if (eraserFadeTimerRef.current) {
            window.clearTimeout(eraserFadeTimerRef.current);
            eraserFadeTimerRef.current = null;
          }
          clearEraserTrail(canvas);
          const deletedCount = commitPendingErasures(canvas, pendingErasuresRef.current);
          if (deletedCount > 0) {
            saveCanvasState();
            notifyChange();
          }
          renderCanvas(canvas);
          return;
        }

        if (latestToolRef.current === "arrow" && isDrawingShapeRef.current) {
          isDrawingShapeRef.current = false;
          clearEraserTrail(canvas);

          const start = shapeStartPointRef.current;
          let end = lastPointerRef.current || start;
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          if (Math.hypot(dx, dy) < 6) {
            end = { x: start.x + 70, y: start.y };
          }

          const color = latestStrokeColorRef.current || "#1e1e1e";
          const width = latestStrokeWidthRef.current || 2;
          const dash =
            latestStrokeStyleRef.current === "dashed"
              ? [8, 8]
              : latestStrokeStyleRef.current === "dotted"
                ? [2, 6]
                : null;
          const isRound = latestEdgesRef.current === "round";
          const op = latestOpacityRef.current / 100;

          const arrowPath = createArrowPath(start.x, start.y, end.x, end.y, width);
          const arrowObj = new Path(arrowPath, {
            stroke: color,
            strokeWidth: width,
            strokeDashArray: dash,
            strokeUniform: true,
            strokeLineCap: isRound ? "round" : "butt",
            strokeLineJoin: isRound ? "round" : "miter",
            fill: "",
            opacity: op,
            selectable: true,
            evented: true,
            centeredRotation: true,
          });

          (arrowObj as CanvasShapeObject).__isArrow = true;
          canvas.add(arrowObj);

          if (arrowObj.controls?.mtr) {
            setupMtrControl(arrowObj.controls.mtr);
          }
          arrowObj.setCoords?.();

          if (!isLockedRef.current) {
            setActiveTool("select");
            applyToolToCanvas(
              canvas,
              "select",
              latestStrokeColorRef.current,
              latestStrokeWidthRef.current,
            );
          } else {
            canvas.forEachObject((obj) => {
              if (obj !== arrowObj) {
                obj.selectable = false;
                obj.evented = false;
              }
            });
          }

          canvas.setActiveObject(arrowObj);
          handleSelectObject(arrowObj);
          renderCanvas(canvas);
          saveCanvasState();
          notifyChange();
          return;
        }

        if (isDrawingShapeRef.current && activeShapeRef.current) {
          const shape = activeShapeRef.current;
          const start = shapeStartPointRef.current;
          const end = lastPointerRef.current || start;
          const dragDist = Math.hypot(end.x - start.x, end.y - start.y);

          // If the user clicked without dragging, provide an intuitive default size
          if (dragDist < 6) {
            if (latestToolRef.current === "rectangle") {
              shape.set({
                originX: "left",
                originY: "top",
                left: start.x,
                top: start.y,
                width: 100,
                height: 70,
              });
            } else if (latestToolRef.current === "ellipse") {
              shape.set({
                originX: "left",
                originY: "top",
                left: start.x,
                top: start.y,
                rx: 50,
                ry: 35,
              });
            } else if (latestToolRef.current === "diamond") {
              shape.set({
                originX: "left",
                originY: "top",
                left: start.x,
                top: start.y,
                scaleX: 1,
                scaleY: 1,
              });
            }
          }

          shape.set({ selectable: true, evented: true });
          shape.centeredRotation = true;
          if (shape.controls?.mtr) {
            setupMtrControl(shape.controls.mtr);
          }
          shape.setCoords?.();
          if (!isLockedRef.current) {
            setActiveTool("select");
            applyToolToCanvas(
              canvas,
              "select",
              latestStrokeColorRef.current,
              latestStrokeWidthRef.current,
            );
          } else {
            canvas.forEachObject((obj) => {
              if (obj !== shape) {
                obj.selectable = false;
                obj.evented = false;
              }
            });
          }
          canvas.setActiveObject(shape);
          handleSelectObject(shape);
          shape.setCoords?.();
          renderCanvas(canvas);
          saveCanvasState();
          notifyChange();
        }
        isDrawingShapeRef.current = false;
        activeShapeRef.current = null;
      };

      canvas.on("after:render", () => {
        if (isErasingRef.current && eraserTrailPointsRef.current.length > 0) {
          drawEraserTrail(canvas, eraserTrailPointsRef.current);
        } else if (isDrawingShapeRef.current && latestToolRef.current === "arrow") {
          drawArrowPreview(canvas, shapeStartPointRef.current, lastPointerRef.current, {
            stroke: latestStrokeColorRef.current || "#1e1e1e",
            strokeWidth: latestStrokeWidthRef.current || 2,
            strokeDashArray:
              latestStrokeStyleRef.current === "dashed"
                ? [8, 8]
                : latestStrokeStyleRef.current === "dotted"
                  ? [2, 6]
                  : null,
            strokeLineCap: latestEdgesRef.current === "round" ? "round" : "butt",
            opacity: latestOpacityRef.current / 100,
          });
        }
      });

      canvas.on("mouse:up", (opt: TPointerEventInfo) => {
        if (opt) {
          lastPointerRef.current = getCanvasPointer(canvas, opt);
        }
        finishShape();
      });

      canvas.on("mouse:wheel", (opt: TPointerEventInfo) => {
        const e = opt.e as WheelEvent | undefined;
        if (!e) return;
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
          // ignore
        }
        const delta = typeof e.deltaY === "number" ? e.deltaY : 0;
        const factor = delta < 0 ? 1.1 : 1 / 1.1;
        const cursor =
          typeof e.offsetX === "number" && typeof e.offsetY === "number"
            ? toViewportPoint(fabric, canvas, e.offsetX, e.offsetY)
            : getCanvasCenter(fabric, canvas);
        const newZoom = applyZoomToCanvas(fabric, canvas, getLiveZoom(canvas, 1) * factor, cursor);
        setZoom(newZoom);
        setViewportLost(checkViewportLost(canvas));
        renderCanvas(canvas);
      });

      // Pointer pan events
      const upperEl = canvas.upperCanvasEl;
      let panPointerId: number | null = null;

      function wantsPan(e: PointerEvent) {
        return spaceDownRef.current || e.button === 1 || latestToolRef.current === "hand";
      }

      function endNativePan() {
        if (panPointerId === null && !isPanningRef.current) return;
        panPointerId = null;
        if (!isPanningRef.current) return;
        isPanningRef.current = false;
        if (!cancelled) {
          applyToolToCanvas(
            canvas,
            latestToolRef.current,
            latestStrokeColorRef.current,
            latestStrokeWidthRef.current,
          );
          setViewportLost(checkViewportLost(canvas));
        }
      }

      const onNativePointerDown = (e: PointerEvent) => {
        if (cancelled || panPointerId !== null) return;
        const target = e.target as Node | null;
        if (!upperEl || !target || !upperEl.contains(target)) return;
        if (!wantsPan(e)) return;
        try {
          e.preventDefault();
        } catch {
          // ignore
        }
        panPointerId = e.pointerId;
        isPanningRef.current = true;
        lastPanRef.current = { x: e.clientX, y: e.clientY };
        try {
          canvas.selection = false;
          canvas.defaultCursor = "grabbing";
        } catch {
          // ignore
        }
        renderCanvas(canvas);
      };

      const onNativePointerMove = (e: PointerEvent) => {
        if (!isPanningRef.current || panPointerId === null || e.pointerId !== panPointerId) return;
        const dx = e.clientX - lastPanRef.current.x;
        const dy = e.clientY - lastPanRef.current.y;
        lastPanRef.current = { x: e.clientX, y: e.clientY };
        if (dx === 0 && dy === 0) return;
        try {
          const pt = toViewportPoint(fabric, canvas, dx, dy);
          if ("x" in pt && "y" in pt) {
            canvas.relativePan(pt as Point);
          }
        } catch {
          // ignore
        }
        renderCanvas(canvas);
      };

      const onNativePointerUp = (e: PointerEvent) => {
        if (panPointerId === null || e.pointerId !== panPointerId) return;
        endNativePan();
      };

      window.addEventListener("pointerdown", onNativePointerDown, { capture: true });
      window.addEventListener("pointermove", onNativePointerMove, { capture: true });
      window.addEventListener("pointerup", onNativePointerUp, { capture: true });
      window.addEventListener("pointercancel", onNativePointerUp, { capture: true });
      window.addEventListener("blur", endNativePan);

      return () => {
        window.removeEventListener("pointerdown", onNativePointerDown, { capture: true });
        window.removeEventListener("pointermove", onNativePointerMove, { capture: true });
        window.removeEventListener("pointerup", onNativePointerUp, { capture: true });
        window.removeEventListener("pointercancel", onNativePointerUp, { capture: true });
        window.removeEventListener("blur", endNativePan);
      };
    }

    let detachListeners: (() => void) | undefined;
    void init().then((cleanup) => {
      detachListeners = cleanup;
    });

    return () => {
      cancelled = true;
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (scrollHandler) window.removeEventListener("scroll", scrollHandler);
      if (resizeObserver) resizeObserver.disconnect();
      if (detachListeners) detachListeners();
      canvasReadyRef.current = false;
      if (canvasInstance) {
        try {
          canvasInstance.dispose();
        } catch {
          // ignore
        }
      }
      fabricCanvasRef.current = null;
    };
  }, [targetCanvasEl, applyToolToCanvas, handleSelectObject, saveCanvasState, notifyChange, loadSnapshotIntoCanvas, setViewportLost, setZoom, setActiveTool]);

  // Load initial snapshot when it becomes available after canvas is ready
  useEffect(() => {
    if (!initialSnapshot || !canvasReadyRef.current || initialSnapshotLoadedRef.current) return;
    initialSnapshotLoadedRef.current = true;
    void loadSnapshotIntoCanvas(initialSnapshot).then(() => {
      saveCanvasState();
    });
  }, [initialSnapshot, loadSnapshotIntoCanvas, saveCanvasState]);

  // Keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        const canvas = fabricCanvasRef.current;
        if (canvas && !spaceDownRef.current) {
          spaceDownRef.current = true;
          e.preventDefault();
          canvas.selection = false;
          canvas.defaultCursor = "grab";
          renderCanvas(canvas);
        }
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlOrCmd && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (ctrlOrCmd && e.shiftKey && e.key === "z") {
        e.preventDefault();
        redo();
      } else if (ctrlOrCmd && e.key === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        handleDeleteSelected();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0" && ctrlOrCmd) {
        handleResetZoom();
      } else if (!ctrlOrCmd && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "v":
            setActiveTool("select");
            break;
          case "h":
            setActiveTool("hand");
            break;
          case "p":
            setActiveTool("draw");
            break;
          case "e":
            setActiveTool("eraser");
            break;
          case "r":
            setActiveTool("rectangle");
            break;
          case "o":
            setActiveTool("ellipse");
            break;
          case "d":
            setActiveTool("diamond");
            break;
          case "a":
            setActiveTool("arrow");
            break;
          case "l":
            setActiveTool("line");
            break;
          case "t":
            setActiveTool("text");
            break;
          case "9":
          case "i":
            handleAddImage();
            break;
        }
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      spaceDownRef.current = false;
      isPanningRef.current = false;
      const canvas = fabricCanvasRef.current;
      if (canvas && canvasReadyRef.current) {
        applyToolToCanvas(
          canvas,
          latestToolRef.current,
          latestStrokeColorRef.current,
          latestStrokeWidthRef.current,
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [undo, redo, handleDeleteSelected, handleZoomIn, handleZoomOut, handleResetZoom, setActiveTool, applyToolToCanvas, handleAddImage]);

  return {
    fabricCanvasRef,
    loadSnapshotIntoCanvas,
    updateStrokeColor,
    updateFillColor,
    updateStrokeWidth,
    updateStrokeStyle,
    updateEdges,
    updateOpacity,
    handleLayerAction,
    handleDeleteSelected,
    handleClearCanvas,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleRecenter,
    handleAddImage,
    handleExportPng,
    handleExportSvg,
    undo,
    redo,
  };
}
