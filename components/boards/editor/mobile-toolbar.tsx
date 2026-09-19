"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  SlidersHorizontal,
  Undo2,
  Redo2,
  Hand,
  MousePointer2,
  Pencil,
  Eraser,
  Square,
  ArrowRight,
  MoreVertical,
  Diamond,
  Circle,
  Minus,
  ImageIcon,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { Tool } from "./editor-types";

interface MobileToolbarProps {
  activeTool: Tool;
  onSelectTool: (tool: Tool) => void;
  strokeColor: string;
  fillColor: string;
  onOpenProperties: () => void;
  isPropertiesOpen: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddImage: () => void;
  onClearCanvas: () => void;
  onResetZoom: () => void;
}

export function MobileToolbar({
  activeTool,
  onSelectTool,
  strokeColor,
  fillColor,
  onOpenProperties,
  isPropertiesOpen,
  onUndo,
  onRedo,
  onAddImage,
  onClearCanvas,
  onResetZoom,
}: MobileToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const isTransparent = fillColor === "transparent";

  return (
    <div className="md:hidden fixed bottom-3 left-0 right-0 z-40 px-3 flex flex-col gap-2 pointer-events-auto select-none">
      {/* -- UPPER ROW: Swatches, Sliders Button, and Undo/Redo -- */}
      <div className="flex items-center justify-between px-1">
        {/* Left: Stroke swatch, Fill swatch, and Properties toggle button */}
        <div className="flex items-center gap-2">
          {/* Stroke color swatch button */}
          <button
            type="button"
            onClick={onOpenProperties}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300/80 bg-white p-1 shadow-sm active:scale-95 transition"
            title="Stroke Color"
          >
            <div
              className="h-full w-full rounded-sm relative overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: strokeColor }}
            >
              {/* Subtle hatched pattern overlay on dark stroke swatches */}
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.4)_50%,transparent_60%)] bg-size-[6px_6px]" />
            </div>
          </button>

          {/* Fill / Background color swatch button */}
          <button
            type="button"
            onClick={onOpenProperties}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300/80 bg-white p-1 shadow-sm active:scale-95 transition"
            title="Background Color"
          >
            <div
              className={`h-full w-full rounded-sm relative overflow-hidden ${isTransparent ? "bg-checkerboard" : ""
                }`}
              style={{ backgroundColor: isTransparent ? undefined : fillColor }}
            >
              {isTransparent && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-[1.5px] bg-rose-500 rotate-45" />
                </div>
              )}
            </div>
          </button>

          {/* Properties / Style button (Sliders icon) */}
          <button
            type="button"
            onClick={onOpenProperties}
            className={`flex h-9 w-9 items-center justify-center rounded-md border transition active:scale-95 ${isPropertiesOpen
              ? "border-[#5e6ad2] bg-[#eceffd] text-[#5e6ad2] ring-2 ring-[#5e6ad2]/30 shadow-sm"
              : "border-gray-300/80 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
              }`}
            title="Tool Properties"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Undo & Redo buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200/90 bg-white text-gray-600 shadow-xs hover:bg-gray-50 active:scale-95 transition"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200/90 bg-white text-gray-600 shadow-xs hover:bg-gray-50 active:scale-95 transition"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* -- BOTTOM DOCKED TOOLBAR -- */}
      <div className="relative flex items-center justify-between rounded-md border border-gray-200/90 bg-white px-2 py-1.5 shadow-lg">
        {/* Hand */}
        <button
          type="button"
          onClick={() => onSelectTool("hand")}
          className={`flex h-9 flex-1 items-center justify-center rounded-md transition ${activeTool === "hand"
            ? "bg-[#eceffd] text-[#5e6ad2]"
            : "text-gray-600 hover:bg-gray-100"
            }`}
          title="Hand / Pan"
        >
          <Hand className="w-4 h-4" />
        </button>

        {/* Select */}
        <button
          type="button"
          onClick={() => onSelectTool("select")}
          className={`flex h-9 flex-1 items-center justify-center rounded-md transition ${activeTool === "select"
            ? "bg-[#eceffd] text-[#5e6ad2]"
            : "text-gray-600 hover:bg-gray-100"
            }`}
          title="Selection"
        >
          <MousePointer2 className="w-4 h-4 fill-current" />
        </button>

        {/* Draw / Pencil */}
        <button
          type="button"
          onClick={() => onSelectTool("draw")}
          className={`flex h-9 flex-1 items-center justify-center rounded-md transition ${activeTool === "draw"
            ? "bg-[#eceffd] text-[#5e6ad2]"
            : "text-gray-600 hover:bg-gray-100"
            }`}
          title="Draw / Pencil"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* Eraser */}
        <button
          type="button"
          onClick={() => onSelectTool("eraser")}
          className={`flex h-9 flex-1 items-center justify-center rounded-md transition ${activeTool === "eraser"
            ? "bg-[#eceffd] text-[#5e6ad2]"
            : "text-gray-600 hover:bg-gray-100"
            }`}
          title="Eraser"
        >
          <Eraser className="w-4 h-4" />
        </button>

        {/* Rectangle */}
        <button
          type="button"
          onClick={() => onSelectTool("rectangle")}
          className={`flex h-9 flex-1 items-center justify-center rounded-md transition ${activeTool === "rectangle"
            ? "bg-[#eceffd] text-[#5e6ad2]"
            : "text-gray-600 hover:bg-gray-100"
            }`}
          title="Rectangle"
        >
          <Square className="w-4 h-4" />
        </button>

        {/* Arrow */}
        <button
          type="button"
          onClick={() => onSelectTool("arrow")}
          className={`flex h-9 flex-1 items-center justify-center rounded-md transition ${activeTool === "arrow"
            ? "bg-[#eceffd] text-[#5e6ad2]"
            : "text-gray-600 hover:bg-gray-100"
            }`}
          title="Arrow"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Text */}
        <button
          type="button"
          onClick={() => onSelectTool("text")}
          className={`flex h-9 flex-1 items-center justify-center rounded-md transition ${activeTool === "text"
            ? "bg-[#eceffd] text-[#5e6ad2]"
            : "text-gray-600 hover:bg-gray-100"
            }`}
          title="Text"
        >
          <span className="text-[15px] font-serif font-bold">A</span>
        </button>

        {/* More Tools (3 dots) */}
        <div className="relative flex-1 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex h-9 w-full items-center justify-center rounded-md transition ${moreOpen ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-100"
              }`}
            title="More shapes and options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 bottom-12 w-48 rounded-md border border-gray-200/90 bg-white p-2 shadow-xl z-50 text-xs font-medium text-gray-700"
              >
                <div className="grid grid-cols-3 gap-1 pb-2 border-b border-gray-100 mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTool("diamond");
                      setMoreOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-md ${activeTool === "diamond" ? "bg-[#eceffd] text-[#5e6ad2]" : "hover:bg-gray-100"
                      }`}
                    title="Diamond"
                  >
                    <Diamond className="w-4 h-4" />
                    <span className="text-[10px] mt-1">Diamond</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectTool("ellipse");
                      setMoreOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-md ${activeTool === "ellipse" ? "bg-[#eceffd] text-[#5e6ad2]" : "hover:bg-gray-100"
                      }`}
                    title="Ellipse"
                  >
                    <Circle className="w-4 h-4" />
                    <span className="text-[10px] mt-1">Ellipse</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectTool("line");
                      setMoreOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-md ${activeTool === "line" ? "bg-[#eceffd] text-[#5e6ad2]" : "hover:bg-gray-100"
                      }`}
                    title="Line"
                  >
                    <Minus className="w-4 h-4" />
                    <span className="text-[10px] mt-1">Line</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onAddImage();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 text-left"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Add image
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onResetZoom();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 text-left"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset zoom (100%)
                </button>

                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    if (window.confirm("Clear the entire canvas?")) onClearCanvas();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-rose-600 hover:bg-rose-50 text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear canvas
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
