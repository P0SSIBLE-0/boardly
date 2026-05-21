"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import type { BoardSnapshot } from "@/shared/types";
import {
  createBoard,
  createShareLink,
  getBoard,
  getRealtimeToken,
  getSession,
  updateBoard,
} from "@/lib/api";
import {
  clearGuestSnapshot,
  loadGuestSnapshot,
  saveGuestSnapshot,
} from "@/lib/guest-board";
import type {
  AppSession,
  BoardDetail,
  PresenceUser,
  RealtimeServerMessage,
} from "@/shared/types";
import { normalizeBoardSnapshot } from "@/shared/snapshots";

type BoardMode = "guest" | "board";
type Tool = "select" | "draw" | "rectangle" | "ellipse" | "diamond" | "arrow" | "line" | "text" | "image";

const SHORTCUTS = [
  { key: "V", label: "Select" },
  { key: "P", label: "Draw" },
  { key: "R", label: "Rectangle" },
  { key: "O", label: "Ellipse" },
  { key: "D", label: "Diamond" },
  { key: "A", label: "Arrow" },
  { key: "L", label: "Line" },
  { key: "T", label: "Text" },
  { key: "Del", label: "Delete" },
  { key: "Ctrl/Cmd Z", label: "Undo" },
  { key: "Ctrl/Cmd Shift Z", label: "Redo" },
];

const GUEST_BOARD_TITLE = "Saved guest board";

const TOOLBAR_COLORS = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6"];

export function BoardEditor({
  mode,
  boardId,
}: {
  mode: BoardMode;
  boardId?: string;
}) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<BoardSnapshot>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("Starting board...");
  const [title, setTitle] = useState("Untitled board");
  const [peers, setPeers] = useState<Record<string, PresenceUser>>({});
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [statusVisible, setStatusVisible] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [zoom, setZoom] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const fabricInstanceRef = useRef<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const latestMode = useRef(mode);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoStackRef = useRef<BoardSnapshot[]>([]);
  const redoStackRef = useRef<BoardSnapshot[]>([]);
  const isDrawingShape = useRef(false);
  const shapeStartPoint = useRef({ x: 0, y: 0 });
  const activeShapeRef = useRef<any>(null);
  const latestTool = useRef<Tool>("select");
  const latestStrokeColor = useRef("#000000");
  const latestStrokeWidth = useRef(2);

  function flashStatus(message: string) {
    setStatus(message);
    setStatusVisible(true);
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = setTimeout(() => setStatusVisible(false), 3000);
  }

  useEffect(() => {
    latestMode.current = mode;
  }, [mode]);

  useEffect(() => {
    latestTool.current = activeTool;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    switch (activeTool) {
      case 'select':
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        canvas.forEachObject((obj: any) => {
          obj.selectable = true;
          obj.evented = true;
        });
        canvas.renderAll();
        break;
      case 'draw':
        canvas.isDrawingMode = true;
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
        
        if (!canvas.freeDrawingBrush) {
          const fabric = fabricInstanceRef.current;
          if (fabric) {
            const brush = new fabric.PencilBrush(canvas);
            brush.color = strokeColor;
            brush.width = strokeWidth;
            canvas.freeDrawingBrush = brush;
          }
        } else {
          canvas.freeDrawingBrush.color = strokeColor;
          canvas.freeDrawingBrush.width = strokeWidth;
        }
        break;
      case 'rectangle':
      case 'ellipse':
      case 'diamond':
      case 'arrow':
      case 'line':
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
        canvas.forEachObject((obj: any) => {
          obj.selectable = false;
          obj.evented = false;
        });
        canvas.renderAll();
        break;
      case 'text':
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = 'text';
        canvas.hoverCursor = 'text';
        canvas.forEachObject((obj: any) => {
          obj.selectable = true;
          obj.evented = true;
        });
        canvas.renderAll();
        break;
    }
  }, [activeTool, strokeColor, strokeWidth]);

  useEffect(() => {
    latestStrokeColor.current = strokeColor;
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = strokeColor;
    }
  }, [strokeColor]);

  useEffect(() => {
    latestStrokeWidth.current = strokeWidth;
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = strokeWidth;
    }
  }, [strokeWidth]);

  useEffect(() => {
    let active = true;

    if (mode === "guest") {
      void getSession()
        .then((nextSession) => {
          if (!active) {
            return;
          }

          setSession(nextSession);
          setInitialSnapshot(normalizeBoardSnapshot(loadGuestSnapshot()));
          setTitle("Guest board");
          flashStatus(
            nextSession.user
              ? "Signed in. Save this board whenever you want."
              : "Guest board. Cached in this browser session.",
          );
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    } else if (boardId) {
      void Promise.all([getSession(), getBoard(boardId)])
        .then(([nextSession, nextBoard]) => {
          if (!active) {
            return;
          }

          if (!nextSession.user) {
            window.location.href = `/sign-in?redirectTo=${encodeURIComponent(`/boards/${boardId}`)}`;
            return;
          }

          setSession(nextSession);
          setBoard(nextBoard);
          setInitialSnapshot(normalizeBoardSnapshot(nextBoard.snapshot));
          setTitle(nextBoard.title);
          flashStatus("Connected to your board.");
        })
        .catch((error) => {
          if (!active) {
            return;
          }

          setStatus(
            error instanceof Error ? error.message : "Unable to open board.",
          );
          setStatusVisible(true);
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [boardId, mode]);

  const saveCanvasState = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const json = canvas.toJSON();
    undoStackRef.current.push(json);
    redoStackRef.current = [];
  }, []);

  const handleCanvasChange = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const snapshot = canvas.toJSON();

    if (latestMode.current === "guest") {
      saveGuestSnapshot(snapshot);
      return;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "snapshot",
          snapshot,
        }),
      );
    }
  }, []);

  const applyRemoteSnapshot = useCallback((snapshot: BoardSnapshot) => {
    const canvas = fabricCanvasRef.current;
    const normalizedSnapshot = normalizeBoardSnapshot(snapshot);

    if (!canvas || !normalizedSnapshot) {
      return;
    }

    canvas.loadFromJSON(normalizedSnapshot, () => {
      canvas.renderAll();
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    let resizeHandler: (() => void) | null = null;

    async function initCanvas() {
      if (!canvasRef.current) return;

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const fabric = await import('fabric');
      const { Canvas, PencilBrush, Rect, Ellipse, Line, IText, Polygon } = fabric;

      const container = canvasRef.current.parentElement;
      const containerWidth = container?.clientWidth || window.innerWidth;
      const containerHeight = container?.clientHeight || window.innerHeight - 60;

      console.log('Canvas container size:', containerWidth, containerHeight);

      const canvas = new Canvas(canvasRef.current, {
        width: containerWidth,
        height: containerHeight,
        backgroundColor: '#f8fafc',
        selection: true,
      });

      // Set up drawing brush immediately
      const brush = new PencilBrush(canvas);
      brush.color = '#000000';
      brush.width = 2;
      canvas.freeDrawingBrush = brush;
      canvas.isDrawingMode = true;

      console.log('Canvas created:', canvas.width, canvas.height);
      console.log('Drawing mode:', canvas.isDrawingMode);
      console.log('Brush:', canvas.freeDrawingBrush);

      fabricCanvasRef.current = canvas;
      fabricInstanceRef.current = fabric;

      if (initialSnapshot) {
        canvas.loadFromJSON(initialSnapshot, () => {
          canvas.renderAll();
        });
      }

      resizeHandler = () => {
        const container = canvasRef.current?.parentElement;
        const containerWidth = container?.clientWidth || window.innerWidth;
        const containerHeight = container?.clientHeight || window.innerHeight - 60;
        
        canvas.setDimensions({
          width: containerWidth,
          height: containerHeight,
        });
      };
      window.addEventListener('resize', resizeHandler);

      canvas.on('object:added', (e: any) => {
        if (canvas.isDrawingMode) return;
        if (e.target) {
          e.target.selectable = true;
          e.target.evented = true;
        }
        saveCanvasState();
        handleCanvasChange();
      });
      canvas.on('object:modified', () => {
        saveCanvasState();
        handleCanvasChange();
      });
      canvas.on('object:removed', () => {
        saveCanvasState();
        handleCanvasChange();
      });
      canvas.on('path:created', () => {
        saveCanvasState();
        handleCanvasChange();
      });

      canvas.on('mouse:down', (opt: any) => {
        const tool = latestTool.current;
        if (tool === 'select' || tool === 'draw' || tool === 'text') return;
        
        const pointer = opt.absolutePointer || canvas.getScenePoint(opt.e) || { x: 0, y: 0 };
        isDrawingShape.current = true;
        shapeStartPoint.current = { x: pointer.x, y: pointer.y };

        const color = latestStrokeColor.current;
        const width = latestStrokeWidth.current;
        const fill = fillColor === 'transparent' ? 'transparent' : fillColor;

        if (tool === 'rectangle') {
          const rect = new Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: fill,
            stroke: color,
            strokeWidth: width,
            selectable: false,
          });
          canvas.add(rect);
          activeShapeRef.current = rect;
        } else if (tool === 'ellipse') {
          const ellipse = new Ellipse({
            left: pointer.x,
            top: pointer.y,
            rx: 0,
            ry: 0,
            fill: fill,
            stroke: color,
            strokeWidth: width,
            selectable: false,
          });
          canvas.add(ellipse);
          activeShapeRef.current = ellipse;
        } else if (tool === 'arrow') {
          const line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: color,
            strokeWidth: width,
            selectable: false,
          });
          canvas.add(line);
          activeShapeRef.current = line;
        } else if (tool === 'line') {
          const line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: color,
            strokeWidth: width,
            selectable: false,
          });
          canvas.add(line);
          activeShapeRef.current = line;
        } else if (tool === 'diamond') {
          const { Polygon } = fabric;
          const diamond = new Polygon([
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
          ], {
            left: pointer.x,
            top: pointer.y,
            fill: fill,
            stroke: color,
            strokeWidth: width,
            selectable: false,
            scaleX: 0,
            scaleY: 0,
          });
          canvas.add(diamond);
          activeShapeRef.current = diamond;
        }
      });

      canvas.on('mouse:move', (opt: any) => {
        if (!isDrawingShape.current || !activeShapeRef.current) return;
        
        const pointer = opt.absolutePointer || canvas.getScenePoint(opt.e) || { x: 0, y: 0 };
        const start = shapeStartPoint.current;
        const shape = activeShapeRef.current;

        if (latestTool.current === 'rectangle') {
          const width = Math.abs(pointer.x - start.x);
          const height = Math.abs(pointer.y - start.y);
          const left = Math.min(pointer.x, start.x);
          const top = Math.min(pointer.y, start.y);
          shape.set({ left, top, width, height });
        } else if (latestTool.current === 'ellipse') {
          const rx = Math.abs(pointer.x - start.x) / 2;
          const ry = Math.abs(pointer.y - start.y) / 2;
          const left = Math.min(pointer.x, start.x);
          const top = Math.min(pointer.y, start.y);
          shape.set({ left, top, rx, ry });
        } else if (latestTool.current === 'arrow' || latestTool.current === 'line') {
          shape.set({ x2: pointer.x, y2: pointer.y });
        } else if (latestTool.current === 'diamond') {
          const width = Math.abs(pointer.x - start.x);
          const height = Math.abs(pointer.y - start.y);
          const left = Math.min(pointer.x, start.x);
          const top = Math.min(pointer.y, start.y);
          shape.set({ left, top, scaleX: width / 2, scaleY: height / 2 });
        }

        canvas.renderAll();
      });

      canvas.on('mouse:up', () => {
        if (isDrawingShape.current && activeShapeRef.current) {
          activeShapeRef.current.set({ selectable: true });
          saveCanvasState();
          handleCanvasChange();
        }
        isDrawingShape.current = false;
        activeShapeRef.current = null;
      });

      canvas.on('mouse:dblclick', async (opt: any) => {
        if (latestTool.current !== 'text') return;
        
        const pointer = opt.absolutePointer || canvas.getScenePoint(opt.e) || { x: 0, y: 0 };
        const text = new IText('Type here', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: latestStrokeColor.current,
          fontFamily: 'Inter, sans-serif',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        saveCanvasState();
        handleCanvasChange();
      });
    }

    initCanvas();

    return () => {
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [initialSnapshot, saveCanvasState, handleCanvasChange]);

  useEffect(() => {
    if (mode !== "board" || !boardId || !session?.user) {
      return;
    }

    let active = true;

    void getRealtimeToken(boardId)
      .then((token) => {
        if (!active) {
          return;
        }

        const socket = new WebSocket(
          `${token.websocketUrl}?token=${encodeURIComponent(token.token)}`,
        );
        socketRef.current = socket;

        socket.addEventListener("message", (event) => {
          const message = JSON.parse(event.data) as RealtimeServerMessage;

          if (message.type === "init") {
            setPeers(
              Object.fromEntries(
                message.peers
                  .filter((peer) => peer.userId !== session.user?.id)
                  .map((peer) => [peer.userId, peer]),
              ),
            );

            applyRemoteSnapshot(message.snapshot);
            return;
          }

          if (
            message.type === "snapshot" &&
            message.authorUserId !== session.user?.id
          ) {
            applyRemoteSnapshot(message.snapshot);
            return;
          }

          if (message.type === "presence") {
            if (message.presence.userId === session.user?.id) {
              return;
            }

            setPeers((current) => ({
              ...current,
              [message.presence.userId]: message.presence,
            }));
            return;
          }

          if (message.type === "presence-remove") {
            setPeers((current) => {
              const next = { ...current };
              delete next[message.userId];
              return next;
            });
          }
        });

        socket.addEventListener("open", () => {
          flashStatus("Realtime sync connected.");
        });

        socket.addEventListener("close", () => {
          if (active) {
            flashStatus("Realtime sync disconnected.");
          }
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to connect to realtime sync.",
        );
        setStatusVisible(true);
      });

    return () => {
      active = false;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [boardId, mode, session?.user, applyRemoteSnapshot]);

  useEffect(() => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;

    let lastPresenceSent = 0;

    function handlePointerMove(event: PointerEvent) {
      if (
        latestMode.current !== "board" ||
        socketRef.current?.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastPresenceSent < 40) {
        return;
      }

      lastPresenceSent = now;
      const bounds = container!.getBoundingClientRect();

      socketRef.current.send(
        JSON.stringify({
          type: "presence",
          presence: {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          },
        }),
      );
    }

    container.addEventListener("pointermove", handlePointerMove);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
    };
  }, [mode]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (ctrlOrCmd && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      } else if (ctrlOrCmd && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const canvas = fabricCanvasRef.current;
        if (canvas && canvas.getActiveObject()) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === '+' && ctrlOrCmd) {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' && ctrlOrCmd) {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0' && ctrlOrCmd) {
        e.preventDefault();
        handleResetZoom();
      } else {
        switch (e.key.toLowerCase()) {
          case 'v':
            setActiveTool('select');
            break;
          case 'p':
            setActiveTool('draw');
            break;
          case 'r':
            setActiveTool('rectangle');
            break;
          case 'o':
            setActiveTool('ellipse');
            break;
          case 'd':
            setActiveTool('diamond');
            break;
          case 'a':
            setActiveTool('arrow');
            break;
          case 'l':
            setActiveTool('line');
            break;
          case 't':
            setActiveTool('text');
            break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom]);

  const peerList = Object.values(peers);

  function undo() {
    const canvas = fabricCanvasRef.current;
    if (!canvas || undoStackRef.current.length === 0) return;
    
    redoStackRef.current.push(canvas.toJSON());
    const prevState = undoStackRef.current.pop();
    if (prevState) {
      canvas.loadFromJSON(prevState, () => {
        canvas.renderAll();
      });
    }
  }

  function redo() {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;
    
    undoStackRef.current.push(canvas.toJSON());
    const nextState = redoStackRef.current.pop();
    if (nextState) {
      canvas.loadFromJSON(nextState, () => {
        canvas.renderAll();
      });
    }
  }

  async function saveGuestBoard() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return null;
    }

    if (!session?.user) {
      window.location.href = "/sign-in?redirectTo=/whiteboard";
      return null;
    }

    flashStatus("Saving guest board...");
    const snapshot = canvas.toJSON();
    const nextBoard = await createBoard({
      title: GUEST_BOARD_TITLE,
      snapshot,
    });
    clearGuestSnapshot();
    return nextBoard;
  }

  async function handleSaveGuestBoard() {
    const nextBoard = await saveGuestBoard();

    if (!nextBoard) {
      return;
    }

    window.location.href = `/boards/${nextBoard.id}`;
  }

  async function handleRenameBoard() {
    if (mode !== "board" || !boardId) {
      return;
    }

    const trimmedTitle = title.trim() || "Untitled board";
    const next = await updateBoard(boardId, trimmedTitle);
    setBoard(next);
    setTitle(next.title);
    flashStatus("Board title updated.");
  }

  async function handleShareGuestBoard() {
    const nextBoard = await saveGuestBoard();

    if (!nextBoard) {
      return;
    }

    const invite = await createShareLink(nextBoard.id);
    const shareData = {
      title: nextBoard.title,
      text: "Join my Boardly board.",
      url: invite.url,
    };

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          flashStatus("Board saved. Share canceled.");
          window.location.href = `/boards/${nextBoard.id}`;
          return;
        }

        await navigator.clipboard.writeText(invite.url);
        flashStatus("Board saved. Share link copied to clipboard.");
        window.location.href = `/boards/${nextBoard.id}`;
        return;
      }

      flashStatus("Board saved. Shared successfully.");
      window.location.href = `/boards/${nextBoard.id}`;
      return;
    }

    await navigator.clipboard.writeText(invite.url);
    flashStatus("Board saved. Share link copied to clipboard.");
    window.location.href = `/boards/${nextBoard.id}`;
  }

  async function handleCreateShareLink() {
    if (!boardId) {
      return;
    }

    const invite = await createShareLink(boardId);
    await navigator.clipboard.writeText(invite.url);
    flashStatus("Share link copied to clipboard.");
  }

  async function handleExportPng() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }

    const objects = canvas.getObjects();
    if (objects.length === 0) {
      flashStatus("Add something to the board before exporting.");
      return;
    }

    const dataURL = canvas.toDataURL({ format: "png", multiplier: 2 });
    const anchor = document.createElement("a");
    anchor.href = dataURL;
    anchor.download = `${(title || "board").replace(/\s+/g, "-").toLowerCase()}.png`;
    anchor.click();
  }

  function handleDeleteSelected() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      return;
    }

    if (activeObject.type === 'activeSelection') {
      const objects = [...activeObject.getObjects()];
      canvas.discardActiveObject();
      objects.forEach((obj: any) => {
        canvas.remove(obj);
      });
    } else {
      canvas.discardActiveObject();
      canvas.remove(activeObject);
    }
    
    saveCanvasState();
    handleCanvasChange();
    canvas.requestRenderAll();
    flashStatus("Deleted.");
  }

  function handleClearCanvas() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    if (canvas.getObjects().length === 0) {
      flashStatus("Canvas is already empty.");
      return;
    }

    canvas.clear();
    canvas.setBackgroundColor('#f8fafc', canvas.renderAll.bind(canvas));
    saveCanvasState();
    handleCanvasChange();
    flashStatus("Canvas cleared.");
  }

  function handleZoomIn() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const newZoom = Math.min(zoom * 1.2, 5);
    setZoom(newZoom);
    canvas.setZoom(newZoom);
    canvas.renderAll();
  }

  function handleZoomOut() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
    canvas.setZoom(newZoom);
    canvas.renderAll();
  }

  function handleResetZoom() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    setZoom(1);
    canvas.setZoom(1);
    canvas.renderAll();
  }

  function handleAddImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const fabric = fabricInstanceRef.current;
      if (!fabric) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const fabricImage = new fabric.Image(img, {
            left: 100,
            top: 100,
            scaleX: 0.5,
            scaleY: 0.5,
          });
          canvas.add(fabricImage);
          canvas.setActiveObject(fabricImage);
          saveCanvasState();
          handleCanvasChange();
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="mx-auto h-6 w-6 animate-spin text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-20"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <p className="mt-3 text-sm text-gray-500">Preparing the whiteboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-white">
      <div className="z-50 shrink-0 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-3">
            <Link
              href={mode === "guest" ? "/" : "/boards"}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              title="Back"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>

            <div className="h-5 w-px bg-gray-200" />

            {mode === "board" ? (
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => {
                  void handleRenameBoard();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                className="h-8 rounded-md border border-transparent bg-transparent px-2.5 text-sm font-medium text-gray-900 outline-none transition hover:border-gray-300 focus:border-gray-400 focus:bg-gray-50"
              />
            ) : (
              <span className="px-2.5 text-sm font-medium text-gray-500">
                Guest board
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {peerList.length > 0 && (
              <div className="flex items-center -space-x-1.5">
                {peerList.slice(0, 3).map((peer) => (
                  <div
                    key={peer.userId}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white"
                    style={{ backgroundColor: peer.color }}
                    title={peer.name}
                  >
                    {peer.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                ))}
                {peerList.length > 3 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-semibold text-gray-600">
                    +{peerList.length - 3}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                void handleExportPng();
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 hover:shadow-sm"
            >
              Export
            </button>
            {mode === "board" ? (
              <button
                type="button"
                onClick={() => {
                  void handleCreateShareLink();
                }}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 hover:shadow-sm"
              >
                Share
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveGuestBoard();
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 hover:shadow-sm"
                >
                  {session?.user ? "Save" : "Sign in to save"}
                </button>
                {session?.user && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleShareGuestBoard();
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 hover:shadow-sm"
                  >
                    Share
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden fabric-canvas-container">
        <canvas ref={canvasRef} id="fabric-canvas" />

        <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-lg">
          <button
            type="button"
            onClick={undo}
            className="rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            title="Undo (Ctrl+Z)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button
            type="button"
            onClick={redo}
            className="rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          <div className="mx-1 h-5 w-px bg-gray-200" />
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="rounded-lg p-1.5 text-gray-600 transition hover:bg-red-50 hover:text-red-600"
            title="Delete (Del)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <div className="mx-1 h-5 w-px bg-gray-200" />
          <span className="min-w-[3rem] text-center text-xs font-medium text-gray-600">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-lg">
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              className={`rounded-lg p-2 transition ${activeTool === 'select' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Select (V)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('draw')}
              className={`rounded-lg p-2 transition ${activeTool === 'draw' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Draw (D)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </button>

            <div className="mx-1 h-6 w-px bg-gray-200" />

            <button
              type="button"
              onClick={() => setActiveTool('rectangle')}
              className={`rounded-lg p-2 transition ${activeTool === 'rectangle' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Rectangle (R)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('ellipse')}
              className={`rounded-lg p-2 transition ${activeTool === 'ellipse' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Ellipse (O)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="12" rx="10" ry="8" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('diamond')}
              className={`rounded-lg p-2 transition ${activeTool === 'diamond' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Diamond"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L22 12L12 22L2 12L12 2Z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('arrow')}
              className={`rounded-lg p-2 transition ${activeTool === 'arrow' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Arrow (A)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('line')}
              className={`rounded-lg p-2 transition ${activeTool === 'line' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Line (L)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="19" x2="19" y2="5" />
              </svg>
            </button>

            <div className="mx-1 h-6 w-px bg-gray-200" />

            <button
              type="button"
              onClick={() => setActiveTool('text')}
              className={`rounded-lg p-2 transition ${activeTool === 'text' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              title="Text (T)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleAddImage}
              className={`rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900`}
              title="Add Image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>

            <div className="mx-1 h-6 w-px bg-gray-200" />

            <div className="flex items-center gap-1 px-1">
              {['#000000', '#e03131', '#2f9e44', '#1971c2', '#f08c00'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setStrokeColor(color)}
                  className="h-5 w-5 rounded-full border-2 transition hover:scale-110"
                  style={{ 
                    backgroundColor: color, 
                    borderColor: strokeColor === color ? '#3b82f6' : 'transparent'
                  }}
                  title={color}
                />
              ))}
            </div>

            <div className="mx-1 h-6 w-px bg-gray-200" />

            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-16"
              title={`Stroke width: ${strokeWidth}`}
            />

            <div className="mx-1 h-6 w-px bg-gray-200" />

            <button
              type="button"
              onClick={handleZoomOut}
              className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              title="Zoom Out"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
              title="Reset Zoom"
            >
              100%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              title="Zoom In"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
          </div>
        </div>

        {peerList.map((peer) => (
          <div
            key={peer.userId}
            className="pointer-events-none absolute z-20 transition-all duration-75 ease-linear"
            style={{ left: peer.x, top: peer.y }}
          >
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              className="drop-shadow-md"
            >
              <path d="M0 0L16 12L8 12L4 20L0 0Z" fill={peer.color} />
            </svg>
            <span
              className="ml-3 mt-1 inline-block whitespace-nowrap rounded-md bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white shadow-md"
            >
              {peer.name}
            </span>
          </div>
        ))}

        <AnimatePresence>
          {statusVisible ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-24 left-1/2 z-30 w-[calc(100%-2rem)] max-w-max -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-center text-xs font-medium text-gray-700 shadow-lg sm:bottom-28 sm:w-auto"
            >
              {status}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {mode === "guest" && !statusVisible ? (
          <div className="absolute bottom-24 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-center text-xs font-medium text-gray-600 shadow-lg sm:bottom-28 sm:max-w-max">
            <span>Cached in browser.</span>
            <button
              type="button"
              onClick={() => {
                void handleSaveGuestBoard();
              }}
              className="text-blue-600 transition hover:underline"
            >
              {session?.user ? "Save" : "Sign in to save"}
            </button>
            {session?.user && (
              <>
                <span className="hidden text-gray-300 sm:inline">|</span>
                <button
                  type="button"
                  onClick={() => {
                    void handleShareGuestBoard();
                  }}
                  className="text-blue-600 transition hover:underline"
                >
                  Share
                </button>
              </>
            )}
          </div>
        ) : null}

        <AnimatePresence>
          {showShortcuts ? (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-24 right-4 z-40 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-gray-200 bg-white p-4 shadow-xl sm:right-6 sm:w-56"
            >
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                Shortcuts
              </p>
              <div className="space-y-2">
                {SHORTCUTS.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[13px] text-gray-700">
                      {shortcut.label}
                    </span>
                    <kbd className="rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-600">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>

              {board && (
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                    Board
                  </p>
                  <p className="mt-1.5 text-[12px] text-gray-600">
                    Role: {board.role}
                  </p>
                  <p className="mt-0.5 text-[12px] text-gray-600">
                    Updated: {new Date(board.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="absolute bottom-6 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 shadow-lg transition hover:bg-gray-50 hover:text-gray-900 sm:right-6 sm:h-9 sm:w-9"
          title="Keyboard shortcuts"
        >
          ?
        </button>
      </div>
    </main>
  );
}
