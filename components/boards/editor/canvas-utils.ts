import type { FabricObject, Point, Control, TPointerEventInfo, TPointerEvent } from "fabric";
import { MIN_ZOOM, MAX_ZOOM, type FabricCanvas, type CanvasShapeObject } from "./editor-types";

export function renderCanvas(canvas: FabricCanvas | null | undefined): void {
  try {
    if (canvas && typeof canvas.requestRenderAll === "function") {
      canvas.requestRenderAll();
    } else if (canvas && typeof canvas.renderAll === "function") {
      canvas.renderAll();
    }
  } catch {
    // ignore render errors during disposal
  }
}

export function toViewportPoint(
  fabricModule: typeof import("fabric") | null | undefined,
  canvas: FabricCanvas | null | undefined,
  x: number,
  y: number,
): Point | { x: number; y: number } {
  if (fabricModule?.Point) {
    return new fabricModule.Point(x, y);
  }
  return { x, y };
}

export function getCanvasCenter(
  fabricModule: typeof import("fabric") | null | undefined,
  canvas: FabricCanvas | null | undefined,
): Point | { x: number; y: number } {
  const w = canvas?.getWidth?.() ?? canvas?.width ?? window.innerWidth;
  const h = canvas?.getHeight?.() ?? canvas?.height ?? window.innerHeight;
  return toViewportPoint(fabricModule, canvas, w / 2, h / 2);
}

export function getLiveZoom(canvas: FabricCanvas | null | undefined, fallback: number): number {
  try {
    const z = canvas?.getZoom?.();
    return typeof z === "number" && Number.isFinite(z) ? z : fallback;
  } catch {
    return fallback;
  }
}

export function applyZoomToCanvas(
  fabricModule: typeof import("fabric") | null | undefined,
  canvas: FabricCanvas | null | undefined,
  nextZoom: number,
  point?: Point | { x: number; y: number },
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM,
): number {
  if (!canvas) return nextZoom;
  const clamped = Math.min(maxZoom, Math.max(minZoom, nextZoom));
  const p = point ?? getCanvasCenter(fabricModule, canvas);
  try {
    const pt = "x" in p && "y" in p ? (p as Point) : undefined;
    if (pt && typeof canvas.zoomToPoint === "function") {
      canvas.zoomToPoint(pt, clamped);
    } else if (typeof canvas.setZoom === "function") {
      canvas.setZoom(clamped);
    }
  } catch {
    // ignore
  }
  return clamped;
}

export function getCanvasPointer(
  canvas: FabricCanvas | null | undefined,
  opt: TPointerEventInfo | { e?: TPointerEvent; scenePoint?: Point; viewportPoint?: Point } | null | undefined,
): { x: number; y: number } {
  if (!opt) return { x: 0, y: 0 };

  const sceneP = "scenePoint" in opt ? opt.scenePoint : undefined;
  if (sceneP && typeof sceneP.x === "number" && typeof sceneP.y === "number") {
    return { x: sceneP.x, y: sceneP.y };
  }

  const viewportP = "viewportPoint" in opt ? opt.viewportPoint : undefined;
  if (viewportP && typeof viewportP.x === "number" && typeof viewportP.y === "number") {
    return { x: viewportP.x, y: viewportP.y };
  }

  if (opt.e && canvas) {
    if (typeof canvas.getScenePoint === "function") {
      try {
        const sp = canvas.getScenePoint(opt.e);
        if (sp && typeof sp.x === "number") return { x: sp.x, y: sp.y };
      } catch {
        // fall through
      }
    }
    if ("getViewportPoint" in canvas && typeof (canvas as unknown as { getViewportPoint: (e: TPointerEvent) => Point }).getViewportPoint === "function") {
      try {
        const vp = (canvas as unknown as { getViewportPoint: (e: TPointerEvent) => Point }).getViewportPoint(opt.e);
        if (vp && typeof vp.x === "number") return { x: vp.x, y: vp.y };
      } catch {
        // fall through
      }
    }
  }
  return { x: 0, y: 0 };
}

export function setupMtrControl(mtr: Control | null | undefined): void {
  if (!mtr) return;
  mtr.offsetY = -24;
  mtr.withConnection = true;
  mtr.cursorStyle = "grab";
  mtr.cursorStyleHandler = () => "grab";
  mtr.sizeX = 14;
  mtr.sizeY = 14;
  mtr.touchSizeX = 24;
  mtr.touchSizeY = 24;
  mtr.render = function (
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(left, top, 5.5, 0, Math.PI * 2, false);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#5e6ad2";
    ctx.stroke();
    ctx.restore();
  };
}

export function removeObjectAndParts(
  canvas: FabricCanvas | null | undefined,
  obj: CanvasShapeObject | null | undefined,
): void {
  if (!canvas || !obj) return;
  const parts: FabricObject[] = [obj];
  if (obj.__arrowHead) parts.push(obj.__arrowHead);
  if (obj.__arrowShaft) parts.push(obj.__arrowShaft);

  const container = obj as { getObjects?: () => FabricObject[]; type?: string };
  if (
    typeof container.getObjects === "function" &&
    (container.type === "activeSelection" || container.type === "ActiveSelection")
  ) {
    try {
      parts.push(...container.getObjects());
    } catch {
      // ignore
    }
  }

  try {
    canvas.discardActiveObject();
    parts.forEach((part) => {
      try {
        canvas.remove(part);
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }
}

export function eraseAtPointer(
  canvas: FabricCanvas | null | undefined,
  pointer: { x: number; y: number },
  pendingList?: Set<CanvasShapeObject>,
  domEvent?: TPointerEvent,
  isLoadingSnapshot = false,
): boolean {
  if (!canvas || isLoadingSnapshot) return false;

  let target: FabricObject | null = null;

  if (domEvent && typeof canvas.findTarget === "function") {
    try {
      const found = canvas.findTarget(domEvent) as unknown;
      if (found && typeof found === "object") {
        if ("target" in found && found.target) {
          target = found.target as FabricObject;
        } else if ("containsPoint" in found) {
          target = found as FabricObject;
        }
      }
    } catch {
      // fall through
    }
  }

  if (!target) {
    try {
      const objects = canvas.getObjects?.() ?? [];
      for (let i = objects.length - 1; i >= 0; i--) {
        const candidate = objects[i];
        if (!candidate || candidate.visible === false) continue;
        try {
          if (
            typeof candidate.containsPoint === "function" &&
            candidate.containsPoint(pointer as Point)
          ) {
            target = candidate;
            break;
          }
        } catch {
          // try next
        }
      }
    } catch {
      // ignore
    }
  }

  if (!target) return false;

  const shapeTarget = target as CanvasShapeObject;

  if (pendingList) {
    if (pendingList.has(shapeTarget)) return false;
    pendingList.add(shapeTarget);

    // Decrease opacity to 50-60% (0.55) as deletion preview feedback
    const currentOp = typeof shapeTarget.opacity === "number" ? shapeTarget.opacity : 1;
    const targetRec = shapeTarget as unknown as Record<string, unknown>;
    if (typeof targetRec._originalOpacity !== "number") {
      targetRec._originalOpacity = currentOp;
    }
    shapeTarget.set({ opacity: Math.max(0.12, currentOp * 0.55) });
    renderCanvas(canvas);
    return true;
  }

  removeObjectAndParts(canvas, shapeTarget);
  renderCanvas(canvas);
  return true;
}

export function eraseAlongSegment(
  canvas: FabricCanvas | null | undefined,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  pendingList?: Set<CanvasShapeObject>,
  domEvent?: TPointerEvent,
  isLoadingSnapshot = false,
): boolean {
  if (!canvas || isLoadingSnapshot) return false;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  let anyErased = false;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt = { x: p1.x + dx * t, y: p1.y + dy * t };
    if (eraseAtPointer(canvas, pt, pendingList, domEvent, isLoadingSnapshot)) {
      anyErased = true;
    }
  }
  return anyErased;
}

export function commitPendingErasures(
  canvas: FabricCanvas | null | undefined,
  pendingList: Set<CanvasShapeObject>,
): number {
  if (!canvas || !pendingList || pendingList.size === 0) return 0;
  let count = 0;
  pendingList.forEach((obj) => {
    try {
      removeObjectAndParts(canvas, obj);
      count++;
    } catch {
      // ignore
    }
  });
  pendingList.clear();
  return count;
}

export function cancelPendingErasures(
  canvas: FabricCanvas | null | undefined,
  pendingList: Set<CanvasShapeObject>,
): void {
  if (!canvas || !pendingList || pendingList.size === 0) return;
  pendingList.forEach((obj) => {
    try {
      const orig = (obj as unknown as Record<string, unknown>)._originalOpacity;
      if (typeof orig === "number") {
        obj.set({ opacity: orig });
        delete (obj as unknown as Record<string, unknown>)._originalOpacity;
      }
    } catch {
      // ignore
    }
  });
  pendingList.clear();
  renderCanvas(canvas);
}

export interface EraserTrailPoint {
  x: number;
  y: number;
  time?: number;
}

export function drawEraserTrail(
  canvas: FabricCanvas | null | undefined,
  points: EraserTrailPoint[],
): void {
  if (!canvas || !canvas.contextTop) return;
  const ctx = canvas.contextTop;
  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const zoom = typeof canvas.getZoom === "function" ? canvas.getZoom() : 1;

  canvas.clearContext(ctx);
  if (!points || points.length === 0) return;

  // Filter points to keep only the recent trailing window (within last 220ms)
  const now = Date.now();
  const validPoints = points.filter((p) => (p.time ? now - p.time < 220 : true));
  if (validPoints.length === 0) return;

  // Restrict to max 10 points so it is a short preview behind the cursor, not spanning the page
  const pts = validPoints.slice(-10);

  ctx.save();
  ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

  // Reduced thickness (8.5px vs previous 14px), tapering down to 2px at the vanishing tail
  const maxThickness = Math.max(5, 8.5 / (zoom || 1));
  const minThickness = Math.max(1.5, 2.5 / (zoom || 1));

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, maxThickness / 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(156, 163, 175, 0.4)";
    ctx.fill();
    ctx.restore();
    return;
  }

  // Draw tapered segments: thickness and opacity reduce along the trail as it vanishes
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];

    // Progress: 0 at the vanishing tail end -> 1 at the cursor
    const progress = (i + 1) / (pts.length - 1);
    const thickness = minThickness + (maxThickness - minThickness) * progress;
    const opacity = 0.08 + 0.34 * progress;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = `rgba(156, 163, 175, ${opacity.toFixed(3)})`;
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  ctx.restore();
}

export function clearEraserTrail(canvas: FabricCanvas | null | undefined): void {
  if (!canvas || !canvas.contextTop) return;
  canvas.clearContext(canvas.contextTop);
}

export interface ArrowGeometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
}

export function computeArrowPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeWidth: number = 2,
): ArrowGeometry {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);

  if (dist < 1) {
    return computeArrowPoints(x1, y1, x1 + 70, y1, strokeWidth);
  }

  // Unit vector along the shaft pointing to the tip
  const ux = dx / dist;
  const uy = dy / dist;

  // Exact perpendicular normal vector
  const nx = -uy;
  const ny = ux;

  // Sleek, proportional arrowhead sizing (42° total opening angle)
  const H = Math.min(Math.max(14, 12 + strokeWidth * 2), Math.max(8, dist * 0.38));
  const W = H * 0.38; // ~20.8° half-angle, total ~41.6°

  // Base of the arrowhead along the shaft
  const bx = x2 - H * ux;
  const by = y2 - H * uy;

  // Symmetrical wings meeting at the tip
  const x3 = bx + W * nx;
  const y3 = by + W * ny;
  const x4 = bx - W * nx;
  const y4 = by - W * ny;

  return { x1, y1, x2, y2, x3, y3, x4, y4 };
}

export function createArrowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeWidth: number = 2,
): string {
  const { x1: sx, y1: sy, x2: ex, y2: ey, x3, y3, x4, y4 } = computeArrowPoints(
    x1,
    y1,
    x2,
    y2,
    strokeWidth,
  );

  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} L ${ex.toFixed(2)} ${ey.toFixed(2)} M ${x3.toFixed(2)} ${y3.toFixed(2)} L ${ex.toFixed(2)} ${ey.toFixed(2)} L ${x4.toFixed(2)} ${y4.toFixed(2)}`;
}

export function drawArrowPreview(
  canvas: FabricCanvas | null | undefined,
  start: { x: number; y: number },
  end: { x: number; y: number },
  options: {
    stroke: string;
    strokeWidth: number;
    strokeDashArray?: number[] | null;
    strokeLineCap?: CanvasLineCap;
    opacity?: number;
  },
): void {
  if (!canvas || !canvas.contextTop) return;
  const ctx = canvas.contextTop;
  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];

  canvas.clearContext(ctx);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;

  const pts = computeArrowPoints(
    start.x,
    start.y,
    end.x,
    end.y,
    options.strokeWidth,
  );

  ctx.save();
  ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

  ctx.beginPath();
  // Shaft
  ctx.moveTo(pts.x1, pts.y1);
  ctx.lineTo(pts.x2, pts.y2);

  // Symmetrical wings meeting at tip
  ctx.moveTo(pts.x3, pts.y3);
  ctx.lineTo(pts.x2, pts.y2);
  ctx.lineTo(pts.x4, pts.y4);

  ctx.strokeStyle = options.stroke;
  ctx.lineWidth = options.strokeWidth;
  ctx.lineCap = (options.strokeLineCap as CanvasLineCap) || "round";
  ctx.lineJoin = "round";
  if (options.opacity !== undefined) {
    ctx.globalAlpha = options.opacity;
  }
  if (options.strokeDashArray && options.strokeDashArray.length > 0) {
    ctx.setLineDash(options.strokeDashArray);
  }
  ctx.stroke();

  ctx.restore();
}

export function checkViewportLost(canvas: FabricCanvas | null | undefined): boolean {
  if (!canvas) return false;
  try {
    const z = typeof canvas.getZoom === "function" ? canvas.getZoom() : 1;
    const vpt = canvas.viewportTransform as number[] | undefined;
    const atDefaultZoom = typeof z !== "number" || Math.abs(z - 1) < 0.01;
    const atOrigin =
      !vpt || (Math.abs(vpt[4] ?? 0) < 0.5 && Math.abs(vpt[5] ?? 0) < 0.5);
    return !(atDefaultZoom && atOrigin);
  } catch {
    return false;
  }
}

export function forEachActiveTarget(
  active: FabricObject | null | undefined,
  callback: (obj: CanvasShapeObject) => void,
): void {
  if (!active) return;
  const multi = active as {
    forEachObject?: (cb: (item: FabricObject) => void) => void;
    _objects?: FabricObject[];
  };

  if (typeof multi.forEachObject === "function") {
    multi.forEachObject((inner) => callback(inner as CanvasShapeObject));
  } else if (Array.isArray(multi._objects) && multi._objects.length > 0) {
    multi._objects.forEach((inner) => callback(inner as CanvasShapeObject));
  } else {
    callback(active as CanvasShapeObject);
  }
}
