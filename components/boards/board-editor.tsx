"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { BoardSnapshot, AppSession, BoardDetail } from "@/shared/types";
import {
  createBoard,
  createShareLink,
  getBoard,
  getSession,
  updateBoard,
} from "@/lib/api";
import {
  clearGuestSnapshot,
  loadGuestSnapshot,
  saveGuestSnapshot,
} from "@/lib/guest-board";
import {
  type BoardMode,
  GUEST_BOARD_TITLE,
} from "./editor/editor-types";
import { BoardHeader } from "./editor/board-header";
import { PropertiesToolbox } from "./editor/properties-toolbox";
import { BottomControls } from "./editor/bottom-controls";
import { CollaboratorCursors } from "./editor/collaborator-cursors";
import { MobileToolbar } from "./editor/mobile-toolbar";
import { useEditorStore } from "./editor/use-editor-store";
import { useBoardRealtime } from "./editor/use-board-realtime";
import { useCanvasManager } from "./editor/use-canvas-manager";

export function BoardEditor({
  mode,
  boardId,
}: {
  mode: BoardMode;
  boardId?: string;
}) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [, setBoard] = useState<BoardDetail | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<BoardSnapshot>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);

  const handleCanvasRef = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    setCanvasElement(el);
  }, []);

  // Zustand state
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
  const viewportLost = useEditorStore((s) => s.viewportLost);
  const mobilePropertiesOpen = useEditorStore((s) => s.mobilePropertiesOpen);
  const statusMessage = useEditorStore((s) => s.statusMessage);
  const statusVisible = useEditorStore((s) => s.statusVisible);
  const title = useEditorStore((s) => s.title);
  const loading = useEditorStore((s) => s.loading);
  const hasSelectedObject = useEditorStore((s) => s.hasSelectedObject);
  const peers = useEditorStore((s) => s.peers);

  // Zustand actions
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setIsLocked = useEditorStore((s) => s.setIsLocked);
  const setTitle = useEditorStore((s) => s.setTitle);
  const setLoading = useEditorStore((s) => s.setLoading);
  const flashStatus = useEditorStore((s) => s.flashStatus);
  const setMobilePropertiesOpen = useEditorStore((s) => s.setMobilePropertiesOpen);
  const setSloppiness = useEditorStore((s) => s.setSloppiness);

  // Initialize session & initial board snapshot
  useEffect(() => {
    let active = true;

    async function initialize() {
      if (mode === "guest") {
        try {
          const nextSession = await getSession();
          if (!active) return;
          setSession(nextSession);
          setTitle(GUEST_BOARD_TITLE);
          const localSnapshot = loadGuestSnapshot();
          if (localSnapshot) {
            setInitialSnapshot(localSnapshot);
          }
        } catch {
          if (!active) return;
          setTitle(GUEST_BOARD_TITLE);
          const localSnapshot = loadGuestSnapshot();
          if (localSnapshot) {
            setInitialSnapshot(localSnapshot);
          }
        } finally {
          if (active) setLoading(false);
        }
      } else if (boardId) {
        try {
          const [nextSession, nextBoard] = await Promise.all([getSession(), getBoard(boardId)]);
          if (!active) return;
          setSession(nextSession);
          setBoard(nextBoard);
          setTitle(nextBoard.title);
          setInitialSnapshot(nextBoard.snapshot);
        } catch (error) {
          if (!active) return;
          flashStatus(error instanceof Error ? error.message : "Failed to load board");
        } finally {
          if (active) setLoading(false);
        }
      } else {
        await Promise.resolve();
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [boardId, mode, setTitle, setLoading, flashStatus]);

  const broadcastSnapshotRef = useRef<(snapshot: BoardSnapshot) => void>(() => {});

  // Handle local change broadcast & persistence
  const handleCanvasChange = useCallback(
    (snapshot: BoardSnapshot) => {
      if (!snapshot) return;
      if (mode === "guest") {
        try {
          saveGuestSnapshot(snapshot);
        } catch {
          // ignore
        }
      } else {
        broadcastSnapshotRef.current(snapshot);
      }
    },
    [mode],
  );

  // Canvas manager hook
  const {
    fabricCanvasRef,
    loadSnapshotIntoCanvas,
    updateStrokeColor,
    updateFillColor,
    updateStrokeWidth,
    updateStrokeStyle,
    updateEdges,
    updateOpacity,
    handleLayerAction,
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
  } = useCanvasManager({
    canvasElementRef: canvasRef,
    canvasElement,
    initialSnapshot,
    onCanvasChange: handleCanvasChange,
  });

  // Realtime hook
  const { broadcastSnapshot } = useBoardRealtime({
    boardId,
    mode,
    onRemoteSnapshot: (snapshot) => {
      void loadSnapshotIntoCanvas(snapshot);
    },
  });

  useEffect(() => {
    broadcastSnapshotRef.current = broadcastSnapshot;
  }, [broadcastSnapshot]);

  // Board actions
  async function saveGuestBoard() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;

    if (!session?.user) {
      window.location.href = "/sign-in?redirectTo=/whiteboard";
      return null;
    }

    flashStatus("Saving guest board...");
    try {
      const snapshot = canvas.toJSON() as BoardSnapshot;
      const nextBoard = await createBoard({
        title: GUEST_BOARD_TITLE,
        snapshot,
      });
      clearGuestSnapshot();
      return nextBoard;
    } catch (error) {
      flashStatus(error instanceof Error ? error.message : "Could not save board.");
      return null;
    }
  }

  async function handleSaveGuestBoard() {
    try {
      const nextBoard = await saveGuestBoard();
      if (!nextBoard) return;
      window.location.href = `/boards/${nextBoard.id}`;
    } catch (error) {
      flashStatus(error instanceof Error ? error.message : "Could not save board.");
    }
  }

  async function handleRenameBoard() {
    if (mode !== "board" || !boardId) return;
    const trimmedTitle = title.trim() || "Untitled board";
    try {
      const next = await updateBoard(boardId, trimmedTitle);
      setBoard(next);
      setTitle(next.title);
      flashStatus("Board title updated.");
    } catch (error) {
      flashStatus(error instanceof Error ? error.message : "Could not rename board.");
    }
  }

  async function handleShare() {
    if (mode === "guest") {
      let nextBoard: BoardDetail | null = null;
      try {
        nextBoard = await saveGuestBoard();
      } catch (error) {
        flashStatus(error instanceof Error ? error.message : "Could not save board.");
        return;
      }
      if (!nextBoard) return;

      let invite = null;
      try {
        invite = await createShareLink(nextBoard.id);
      } catch {
        flashStatus("Board saved, but share link failed.");
        window.location.href = `/boards/${nextBoard.id}`;
        return;
      }

      const shareData = {
        title: nextBoard.title,
        text: "Join my Boardly board.",
        url: invite.url,
      };

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share(shareData);
          flashStatus("Board saved. Shared successfully.");
        } catch {
          await navigator.clipboard.writeText(invite.url);
          flashStatus("Board saved. Share link copied to clipboard.");
        }
        window.location.href = `/boards/${nextBoard.id}`;
        return;
      }

      await navigator.clipboard.writeText(invite.url);
      flashStatus("Board saved. Share link copied to clipboard.");
      window.location.href = `/boards/${nextBoard.id}`;
    } else {
      if (!boardId) return;
      try {
        const invite = await createShareLink(boardId);
        await navigator.clipboard.writeText(invite.url);
        flashStatus("Share link copied to clipboard.");
      } catch (error) {
        flashStatus(error instanceof Error ? error.message : "Could not create share link.");
      }
    }
  }

  const peerList = useMemo(() => Object.values(peers), [peers]);
  const showToolbox = Boolean(hasSelectedObject || (activeTool !== "select" && activeTool !== "hand"));

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-white select-none">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-xs transition-opacity duration-200">
          <div className="text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#5e6ad2]" />
            <p className="mt-3 text-sm font-medium text-gray-600">Preparing the whiteboard...</p>
          </div>
        </div>
      )}
      {/* Top Header & Floating Toolbar */}
      <BoardHeader
        mode={mode}
        title={title}
        onTitleChange={setTitle}
        onRenameBoard={() => void handleRenameBoard()}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
        onAddImage={handleAddImage}
        onExportPng={() => handleExportPng(title)}
        onExportSvg={() => handleExportSvg(title)}
        onRecenter={handleRecenter}
        onClearCanvas={handleClearCanvas}
        onResetZoom={handleResetZoom}
        onSaveGuestBoard={() => void handleSaveGuestBoard()}
        onShare={() => void handleShare()}
        peers={peerList}
      />

      {/* Floating Left Properties Toolbox */}
      <PropertiesToolbox
        show={showToolbox}
        isMobileOpen={mobilePropertiesOpen}
        onCloseMobile={() => setMobilePropertiesOpen(false)}
        strokeColor={strokeColor}
        onStrokeColorChange={updateStrokeColor}
        fillColor={fillColor}
        onFillColorChange={updateFillColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={updateStrokeWidth}
        strokeStyle={strokeStyle}
        onStrokeStyleChange={updateStrokeStyle}
        sloppiness={sloppiness}
        onSloppinessChange={setSloppiness}
        edges={edges}
        onEdgesChange={updateEdges}
        opacity={opacity}
        onOpacityChange={updateOpacity}
        onLayerAction={handleLayerAction}
      />

      {/* Canvas Workspace */}
      <div className="relative min-h-0 flex-1 overflow-hidden fabric-canvas-container">
        <canvas ref={handleCanvasRef} id="fabric-canvas" />
        <CollaboratorCursors peers={peerList} />
      </div>

      {/* Bottom Controls (Zoom, History, Status, Recenter) */}
      <BottomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onUndo={undo}
        onRedo={redo}
        viewportLost={viewportLost}
        onRecenter={handleRecenter}
        statusMessage={statusMessage}
        statusVisible={statusVisible}
      />

      {/* Mobile Bottom Toolbar (Hidden on desktop) */}
      <MobileToolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        strokeColor={strokeColor}
        fillColor={fillColor}
        onOpenProperties={() => setMobilePropertiesOpen((prev) => !prev)}
        isPropertiesOpen={mobilePropertiesOpen}
        onUndo={undo}
        onRedo={redo}
        onAddImage={handleAddImage}
        onClearCanvas={handleClearCanvas}
        onResetZoom={handleResetZoom}
      />
    </main>
  );
}