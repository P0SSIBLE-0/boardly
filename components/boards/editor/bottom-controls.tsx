"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Minus,
  Plus,
  Undo2,
  Redo2,
  Crosshair,
  X,
} from "lucide-react";
import { SHORTCUTS } from "./editor-types";

interface BottomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onUndo: () => void;
  onRedo: () => void;
  viewportLost: boolean;
  onRecenter: () => void;
  statusMessage: string;
  statusVisible: boolean;
}

export function BottomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onUndo,
  onRedo,
  viewportLost,
  onRecenter,
  statusMessage,
  statusVisible,
}: BottomControlsProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <>
      {/* -- BOTTOM-LEFT: Zoom & Undo/Redo Pill (Desktop Only) -- */}
      <div className="hidden md:flex absolute bottom-4 left-4 z-40 items-center gap-1 rounded-md border border-gray-200/90 bg-white px-2 py-1.5 shadow-md select-none pointer-events-auto">
        <button
          type="button"
          onClick={onZoomOut}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
          title="Zoom out"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onResetZoom}
          className="px-2 text-xs font-mono font-medium text-gray-700 hover:text-gray-900 transition"
          title="Reset zoom to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
          title="Zoom in"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={onUndo}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
          title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* -- CENTER TOAST MESSAGES & RECENTER BUTTON -- */}
      <div className="pointer-events-none absolute bottom-28 md:bottom-20 left-1/2 z-30 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {viewportLost && (
            <motion.button
              type="button"
              onClick={onRecenter}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-gray-200/90 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-lg transition hover:bg-gray-50 hover:text-gray-900"
              title="Back to original view"
            >
              <Crosshair className="w-3.5 h-3.5" />
              Recenter
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {statusVisible && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="max-w-full rounded-md border border-gray-200/90 bg-white px-4 py-2 text-center text-xs font-medium text-gray-700 shadow-lg"
            >
              {statusMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* -- BOTTOM-RIGHT: Help Button (?) & Shortcuts Modal (Desktop Only) -- */}
      <div className="hidden md:block absolute bottom-4 right-4 z-40 select-none pointer-events-auto">
        <button
          type="button"
          onClick={() => setShowShortcuts(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200/90 bg-white text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-95"
          title="Keyboard shortcuts (?)"
        >
          ?
        </button>
      </div>

      {/* Shortcuts Modal Dialog */}
      <AnimatePresence>
        {showShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShortcuts(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-md border border-gray-200/90 bg-white p-5 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">Keyboard shortcuts</h3>
                <button
                  type="button"
                  onClick={() => setShowShortcuts(false)}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
                {SHORTCUTS.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1 text-xs text-gray-600"
                  >
                    <span>{label}</span>
                    <kbd className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-600 shadow-2xs">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
