"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  Square,
  Squircle,
  ChevronsDown,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  X,
  Pipette,
} from "lucide-react";
import {
  STROKE_COLORS,
  BG_COLORS,
  type StrokeStyle,
  type Sloppiness,
  type Edges,
  type LayerAction,
} from "./editor-types";

interface PropertiesToolboxProps {
  show: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  fillColor: string;
  onFillColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  strokeStyle: StrokeStyle;
  onStrokeStyleChange: (style: StrokeStyle) => void;
  sloppiness: Sloppiness;
  onSloppinessChange: (slop: Sloppiness) => void;
  edges: Edges;
  onEdgesChange: (edge: Edges) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  onLayerAction: (action: LayerAction) => void;
}

function PropertyControls({
  strokeColor,
  onStrokeColorChange,
  fillColor,
  onFillColorChange,
  strokeWidth,
  onStrokeWidthChange,
  strokeStyle,
  onStrokeStyleChange,
  sloppiness,
  onSloppinessChange,
  edges,
  onEdgesChange,
  opacity,
  onOpacityChange,
  onLayerAction,
}: Omit<PropertiesToolboxProps, "show" | "isMobileOpen" | "onCloseMobile">) {
  return (
    <>
      {/* Stroke Palette */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Stroke
          </label>
          <span className="text-[10px] font-mono text-gray-400 uppercase">
            {strokeColor}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STROKE_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => onStrokeColorChange(c.hex)}
              className={`h-5 w-5 rounded-sm border transition flex items-center justify-center ${
                strokeColor.toLowerCase() === c.hex.toLowerCase()
                  ? "ring-2 ring-[#5e6ad2] ring-offset-1 border-transparent scale-105"
                  : "border-gray-200 hover:scale-105"
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.label}
            />
          ))}

          {/* Custom Stroke Color Picker */}
          {(() => {
            const isPreset = STROKE_COLORS.some((c) => c.hex.toLowerCase() === strokeColor.toLowerCase());
            const hexVal = strokeColor.startsWith("#") && strokeColor.length === 7 ? strokeColor : "#1e1e1e";
            return (
              <label
                className={`relative h-5 w-5 rounded-sm border transition flex items-center justify-center cursor-pointer overflow-hidden ${
                  !isPreset
                    ? "ring-2 ring-[#5e6ad2] ring-offset-1 border-transparent scale-105"
                    : "border-gray-200 hover:border-gray-300 hover:scale-105"
                }`}
                style={{
                  backgroundColor: !isPreset ? strokeColor : "transparent",
                  backgroundImage: isPreset
                    ? "conic-gradient(from 180deg at 50% 50%, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff0080, #ff0000)"
                    : "none",
                }}
                title={!isPreset ? `Custom stroke: ${strokeColor}` : "Pick custom stroke color"}
              >
                <input
                  type="color"
                  value={hexVal}
                  onChange={(e) => onStrokeColorChange(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {isPreset && (
                  <Pipette className="w-2.5 h-2.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] pointer-events-none" />
                )}
              </label>
            );
          })()}
        </div>
      </div>

      {/* Background Palette */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Background
          </label>
          <span className="text-[10px] font-mono text-gray-400 uppercase">
            {fillColor === "transparent" ? "None" : fillColor}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {BG_COLORS.map((c) => {
            const isActive = fillColor.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => onFillColorChange(c.hex)}
                className={`h-5 w-5 rounded-sm border transition relative overflow-hidden flex items-center justify-center ${
                  isActive
                    ? "ring-2 ring-[#5e6ad2] ring-offset-1 border-transparent scale-105"
                    : "border-gray-200 hover:scale-105"
                } ${c.isChecker ? "bg-checkerboard" : ""}`}
                style={{ backgroundColor: c.isChecker ? undefined : c.hex }}
                title={c.label}
              >
                {c.isChecker && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-[1.5px] bg-rose-500 rotate-45" />
                  </div>
                )}
              </button>
            );
          })}

          {/* Custom Background Color Picker */}
          {(() => {
            const isPreset = BG_COLORS.some((c) => c.hex.toLowerCase() === fillColor.toLowerCase());
            const isCustom = !isPreset && fillColor !== "transparent";
            const hexVal = fillColor.startsWith("#") && fillColor.length === 7 ? fillColor : "#ffffff";
            return (
              <label
                className={`relative h-5 w-5 rounded-sm border transition flex items-center justify-center cursor-pointer overflow-hidden ${
                  isCustom
                    ? "ring-2 ring-[#5e6ad2] ring-offset-1 border-transparent scale-105"
                    : "border-gray-200 hover:border-gray-300 hover:scale-105"
                }`}
                style={{
                  backgroundColor: isCustom ? fillColor : "transparent",
                  backgroundImage: !isCustom
                    ? "conic-gradient(from 180deg at 50% 50%, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff0080, #ff0000)"
                    : "none",
                }}
                title={isCustom ? `Custom background: ${fillColor}` : "Pick custom background color"}
              >
                <input
                  type="color"
                  value={hexVal}
                  onChange={(e) => onFillColorChange(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {!isCustom && (
                  <Pipette className="w-2.5 h-2.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] pointer-events-none" />
                )}
              </label>
            );
          })()}
        </div>
      </div>

      {/* Stroke Width */}
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
          Stroke width
        </label>
        <div className="flex rounded-md border border-gray-200 p-0.5 bg-gray-50/50">
          {[
            { w: 2, label: "Thin", barH: 2 },
            { w: 4, label: "Medium", barH: 3 },
            { w: 8, label: "Thick", barH: 5 },
          ].map(({ w, label, barH }) => (
            <button
              key={w}
              type="button"
              onClick={() => onStrokeWidthChange(w)}
              className={`flex-1 flex items-center justify-center py-1 rounded-sm text-xs font-medium transition ${strokeWidth === w
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
                }`}
              title={label}
            >
              <span
                className="w-3.5 rounded-full bg-current"
                style={{ height: `${barH}px` }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Style */}
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
          Stroke style
        </label>
        <div className="flex rounded-md border border-gray-200 p-0.5 bg-gray-50/50">
          {[
            { id: "solid", label: "Solid", svg: <line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="2" /> },
            { id: "dashed", label: "Dashed", svg: <line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="2" strokeDasharray="3.5 2.5" /> },
            { id: "dotted", label: "Dotted", svg: <line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="2" strokeDasharray="1.5 2" strokeLinecap="round" /> },
          ].map(({ id, label, svg }) => (
            <button
              key={id}
              type="button"
              onClick={() => onStrokeStyleChange(id as StrokeStyle)}
              className={`flex-1 flex items-center justify-center py-1 rounded-sm text-xs font-medium transition ${strokeStyle === id
                ? "bg-white text-[#5e6ad2] shadow-xs"
                : "text-gray-500 hover:text-gray-800"
                }`}
              title={label}
            >
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                {svg}
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Sloppiness */}
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
          Sloppiness
        </label>
        <div className="flex rounded-md border border-gray-200 p-0.5 bg-gray-50/50">
          {[
            { id: "architect", label: "Architect", icon: "📐" },
            { id: "artist", label: "Artist", icon: "✏️" },
            { id: "cartoon", label: "Cartoon", icon: "🎨" },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSloppinessChange(id as Sloppiness)}
              className={`flex-1 flex items-center justify-center py-0.5 rounded-sm text-[11px] font-medium transition ${sloppiness === id
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
                }`}
              title={label}
            >
              <span>{icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Edges */}
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
          Edges
        </label>
        <div className="flex rounded-md border border-gray-200 p-0.5 bg-gray-50/50">
          <button
            type="button"
            onClick={() => onEdgesChange("sharp")}
            className={`flex-1 flex items-center justify-center py-1 rounded-sm text-xs font-medium transition ${edges === "sharp"
              ? "bg-white text-gray-900 shadow-xs"
              : "text-gray-500 hover:text-gray-800"
              }`}
            title="Sharp corners"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onEdgesChange("round")}
            className={`flex-1 flex items-center justify-center py-1 rounded-sm text-xs font-medium transition ${edges === "round"
              ? "bg-white text-gray-900 shadow-xs"
              : "text-gray-500 hover:text-gray-800"
              }`}
            title="Rounded corners"
          >
            <Squircle className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Opacity
          </label>
          <span className="text-[11px] font-mono text-gray-500">{opacity}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={opacity}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
          className="w-full h-1 slider-lavender cursor-pointer"
        />
      </div>

      {/* Layers */}
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
          Layers
        </label>
        <div className="flex rounded-md border border-gray-200 p-0.5 bg-gray-50/50">
          <button
            type="button"
            onClick={() => onLayerAction("back")}
            className="flex-1 flex items-center justify-center py-0.5 rounded-sm text-gray-600 hover:bg-white hover:text-gray-900 transition"
            title="Send to back"
          >
            <ChevronsDown className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onLayerAction("backward")}
            className="flex-1 flex items-center justify-center py-0.5 rounded-sm text-gray-600 hover:bg-white hover:text-gray-900 transition"
            title="Send backward"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onLayerAction("forward")}
            className="flex-1 flex items-center justify-center py-0.5 rounded-sm text-gray-600 hover:bg-white hover:text-gray-900 transition"
            title="Bring forward"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onLayerAction("front")}
            className="flex-1 flex items-center justify-center py-0.5 rounded-sm text-gray-600 hover:bg-white hover:text-gray-900 transition"
            title="Bring to front"
          >
            <ChevronsUp className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
}

export function PropertiesToolbox(props: PropertiesToolboxProps) {
  const { show, isMobileOpen, onCloseMobile } = props;

  return (
    <>
      {/* Desktop Floating Left Panel */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: -16, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -16, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="hidden md:flex absolute left-4 top-16 z-30 flex-col gap-2 rounded-md border border-gray-200/90 bg-white p-2.5 shadow-lg w-48 select-none pointer-events-auto"
          >
            <PropertyControls {...props} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Popover Style Sheet (Compact, docked above bottom toolbar) */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-black/15 backdrop-blur-2xs md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="fixed bottom-28 left-3 w-58 z-50 rounded-md border border-gray-200/90 bg-white p-2.5 shadow-xl md:hidden max-h-[52vh] overflow-y-auto space-y-2 select-none pointer-events-auto"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Style</span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="flex h-5 w-5 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                  aria-label="Close styles"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <PropertyControls {...props} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
