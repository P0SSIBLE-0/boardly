"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu,
  Save,
  Home,
  ImageIcon,
  FileCode,
  Crosshair,
  Trash2,
  Lock,
  Hand,
  MousePointer2,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Eraser,
  MoreHorizontal,
  Share2,
  PanelRight,
} from "lucide-react";
import type { PresenceUser } from "@/shared/types";
import type { Tool, BoardMode } from "./editor-types";

interface BoardHeaderProps {
  mode: BoardMode;
  title: string;
  onTitleChange: (newTitle: string) => void;
  onRenameBoard: () => void;
  activeTool: Tool;
  onSelectTool: (tool: Tool) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  onAddImage: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onRecenter: () => void;
  onClearCanvas: () => void;
  onResetZoom: () => void;
  onSaveGuestBoard: () => void;
  onShare: () => void;
  peers: PresenceUser[];
}

export function BoardHeader({
  mode,
  title,
  onTitleChange,
  onRenameBoard,
  activeTool,
  onSelectTool,
  isLocked,
  onToggleLock,
  onAddImage,
  onExportPng,
  onExportSvg,
  onRecenter,
  onClearCanvas,
  onResetZoom,
  onSaveGuestBoard,
  onShare,
  peers,
}: BoardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);

  const isShapeTool =
    activeTool === "rectangle" ||
    activeTool === "ellipse" ||
    activeTool === "diamond" ||
    activeTool === "arrow" ||
    activeTool === "line";

  return (
    <>
      {/* -- TOP-LEFT: Hamburger Menu Button & Dropdown -- */}
      <div className="absolute left-4 top-3.5 z-40">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className={`flex h-10 w-10 items-center justify-center rounded-md border border-gray-200/90 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95 ${menuOpen ? "ring-2 ring-[#5e6ad2]/20" : ""
            }`}
          title="Board Menu"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-12 w-64 rounded-md border border-gray-200/90 bg-white p-2 shadow-2xl z-50 select-none"
            >
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Board
                </div>
                {mode === "board" ? (
                  <input
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    onBlur={onRenameBoard}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="mt-1 w-full rounded-md border border-transparent px-2 py-1 text-sm font-semibold text-gray-800 hover:border-gray-200 focus:border-[#5e6ad2] focus:bg-gray-50 outline-none transition"
                    placeholder="Board title"
                  />
                ) : (
                  <div className="mt-1 text-sm font-semibold text-gray-800 px-2 py-1">
                    Guest board
                  </div>
                )}
              </div>
              <div className="py-1.5 space-y-0.5 text-xs text-gray-700 font-medium">
                {mode === "guest" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onSaveGuestBoard();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-semibold text-[#5e6ad2] hover:bg-[#eceffd] transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save board to account
                  </button>
                )}
                <Link
                  href="/dashboard"
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 hover:bg-gray-100 transition"
                  onClick={() => setMenuOpen(false)}
                >
                  <Home className="w-3.5 h-3.5" />
                  Return to Dashboard
                </Link>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onExportPng();
                  }}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-gray-100 transition"
                >
                  <span className="flex items-center gap-2.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Export PNG image
                  </span>
                  <span className="text-[10px] text-gray-400">Ctrl+Shift+E</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onExportSvg();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 hover:bg-gray-100 transition"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Export SVG
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onRecenter();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 hover:bg-gray-100 transition"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  Recenter canvas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm("Are you sure you want to clear the canvas?")) {
                      onClearCanvas();
                    }
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear canvas
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* -- TOP-CENTER: Floating Toolbar Pill (Desktop Only) -- */}
      <div className="hidden md:flex absolute top-3.5 left-1/2 -translate-x-1/2 z-40 flex-col items-center select-none pointer-events-auto">
        <div className="flex items-center gap-1 rounded-md border border-gray-200/90 bg-white px-2 py-1.5 shadow-md">
          {/* Lock */}
          <button
            type="button"
            onClick={onToggleLock}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition ${isLocked
              ? "bg-[#5e6ad2] text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            title={isLocked ? "Keep selected tool active (active)" : "Keep selected tool active"}
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          {/* Hand */}
          <button
            type="button"
            onClick={() => onSelectTool("hand")}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${activeTool === "hand"
              ? "bg-[#eceffd] text-[#5e6ad2]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            title="Hand / Pan (H)"
          >
            <Hand className="w-4 h-4" />
          </button>

          {/* Select */}
          <button
            type="button"
            onClick={() => onSelectTool("select")}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${activeTool === "select"
              ? "bg-[#eceffd] text-[#5e6ad2]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            title="Selection (V)"
          >
            <MousePointer2 className="w-3.5 h-3.5 fill-current" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold leading-none opacity-60">v</span>
          </button>

          {/* Rectangle */}
          <button
            type="button"
            onClick={() => onSelectTool("rectangle")}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${activeTool === "rectangle"
              ? "bg-[#eceffd] text-[#5e6ad2]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            title="Rectangle (R)"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold leading-none opacity-60">R</span>
          </button>

          {/* Diamond */}
          <button
            type="button"
            onClick={() => onSelectTool("diamond")}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${activeTool === "diamond"
              ? "bg-[#eceffd] text-[#5e6ad2]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            title="Diamond (D)"
          >
            <Diamond className="w-3.5 h-3.5" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold leading-none opacity-60">D</span>
          </button>

          {/* Ellipse */}
          <button
            type="button"
            onClick={() => onSelectTool("ellipse")}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${activeTool === "ellipse"
              ? "bg-[#eceffd] text-[#5e6ad2]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            title="Ellipse (O)"
          >
            <Circle className="w-3.5 h-3.5" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold leading-none opacity-60">O</span>
          </button>

          {/* Arrow */}
          <button
            type="button"
            onClick={() => onSelectTool("arrow")}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${activeTool === "arrow"
              ? "bg-[#eceffd] text-[#5e6ad2]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            title="Arrow (A)"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold leading-none opacity-60">A</span>
          </button>

          {/* Line */}
          <button
            type="button"
            onClick={() => onSelectTool("line")}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${activeTool === "line"
              ? "bg-[#eceffd] text-[#5e6ad2]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            title="Line (L)"
          >
            <Minus className="w-3.5 h-3.5" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold leading-none opacity-60">L</span>
          </button>

          {/* Pencil */}
          <button
            type="button"
            onClick={() => onSelectTool("draw")}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${activeTool === "draw"
              ? "bg-[#eceffd] text-[#5e6ad2]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            title="Draw / Pencil (P)"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold leading-none opacity-60">P</span>
          </button>

          {/* Text */}
          <button
            type="button"
            onClick={() => onSelectTool("text")}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${activeTool === "text"
              ? "bg-[#eceffd] text-[#5e6ad2]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            title="Text (T)"
          >
            <span className="text-[15px] font-serif font-bold">A</span>
            <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold leading-none opacity-60">T</span>
          </button>

          {/* Image */}
          <button
            type="button"
            onClick={onAddImage}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
            title="Add image (9)"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold leading-none opacity-60">9</span>
          </button>

          {/* Eraser */}
          <button
            type="button"
            onClick={() => onSelectTool("eraser")}
            className={`relative flex h-8 w-8 items-center justify-center rounded-md transition ${activeTool === "eraser"
              ? "bg-[#eceffd] text-[#5e6ad2]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            title="Eraser (E)"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold leading-none opacity-60">E</span>
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-gray-200 mx-0.5" />

          {/* More Options */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreToolsOpen(!moreToolsOpen)}
              className="flex h-8 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition"
              title="More tools"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {moreToolsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  className="absolute right-0 top-10 w-44 rounded-md border border-gray-200/90 bg-white p-1.5 shadow-xl z-50 text-xs font-medium text-gray-700"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMoreToolsOpen(false);
                      onResetZoom();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-gray-100 text-left"
                  >
                    Reset zoom (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreToolsOpen(false);
                      onRecenter();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-gray-100 text-left"
                  >
                    Zoom to fit
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setMoreToolsOpen(false);
                      if (window.confirm("Clear the entire canvas?")) onClearCanvas();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-rose-50 text-rose-600 text-left"
                  >
                    Clear canvas
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* -- CONTEXT KEYBOARD HELPER HINT -- */}
        <div className="mt-2 flex items-center gap-1.5 rounded-full bg-white/90 border border-gray-200/80 px-2.5 py-0.5 text-[11px] font-medium text-gray-500 shadow-sm backdrop-blur-sm pointer-events-none transition">
          {activeTool === "select" && (
            <span>
              Hold <kbd className="font-sans font-semibold text-gray-700">Ctrl</kbd> to deep select, and to prevent dragging
            </span>
          )}
          {isShapeTool && (
            <span>
              <kbd className="font-sans font-semibold text-gray-700">Enter</kbd> to add text,{" "}
              <kbd className="font-sans font-semibold text-gray-700">Ctrl + ↑↓</kbd> to create a flowchart
            </span>
          )}
          {activeTool === "hand" && <span>Click and drag to pan canvas</span>}
          {activeTool === "draw" && <span>Freehand drawing</span>}
          {activeTool === "eraser" && <span>Click or drag over elements to erase</span>}
          {activeTool === "text" && <span>Click anywhere to start typing</span>}
        </div>
      </div>

      {/* -- TOP-RIGHT: Collaborators, Share Button & Sidebar Toggle -- */}
      <div className="absolute right-4 top-3.5 z-40 flex items-center gap-2 select-none pointer-events-auto">
        {peers.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden">
            {peers.slice(0, 4).map((peer) => (
              <div
                key={peer.userId}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: peer.color }}
                title={peer.name}
              >
                {peer.name[0]?.toUpperCase()}
              </div>
            ))}
            {peers.length > 4 && (
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[10px] font-bold text-gray-600 shadow-sm">
                +{peers.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Linear lavender Share button (Desktop Only) */}
        <button
          type="button"
          onClick={onShare}
          className="hidden md:flex h-9 items-center gap-2 rounded-md bg-[#5e6ad2] px-3.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#828fff] active:scale-95"
          title="Share board"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>

        {/* Sidebar toggle button */}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200/90 bg-white text-gray-600 shadow-sm hover:bg-gray-50 active:scale-95 transition"
          title="Toggle sidebar"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
