"use client";

import Link from "next/link";
import { motion } from "motion/react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const FEATURES = [
  {
    label: "Instant start",
    desc: "No sign-up required. Jump into a blank canvas and start drawing immediately.",
  },
  {
    label: "Full toolkit",
    desc: "Shapes, arrows, text, freehand drawing, undo — everything you need built in.",
  },
  {
    label: "Team up later",
    desc: "Sign in to save boards permanently, invite collaborators, and edit in realtime.",
  },
];

export function LandingHero() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#09090b] selection:bg-white/10 text-zinc-50">
      {/* Subtle modern spotlight background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#09090b] transition-colors" aria-hidden>
        <div className="absolute top-[-20%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-zinc-800/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-zinc-800/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-6">
        {/* ── Header ─────────────────────────── */}
        <header className="flex items-center justify-between py-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-white hover:opacity-80 transition-opacity"
          >
            <div className="h-5 w-5 rounded-md bg-white text-black flex items-center justify-center text-[10px] font-bold">B</div>
            Boardly
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/whiteboard"
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Start drawing
            </Link>
          </nav>
        </header>

        {/* ── Hero ───────────────────────────── */}
        <section className="flex flex-1 items-center py-16 lg:py-24">
          <div className="grid w-full gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Copy */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-dot" />
                Collaborative core
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-[-0.03em] text-white">
                Think together. <br className="hidden sm:block" />
                <span className="text-zinc-500">Start instantly.</span>
              </h1>

              <p className="mt-6 max-w-lg text-base md:text-lg leading-relaxed text-zinc-400 font-normal">
                Open a blank canvas with zero friction. Draw, sketch, and
                brainstorm solo — then invite your team when you&apos;re ready to
                collaborate.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  href="/whiteboard"
                  className="group inline-flex h-11 items-center justify-center rounded-md bg-white px-6 text-[15px] font-medium text-black transition hover:bg-zinc-200"
                >
                  Open a canvas
                  <span className="ml-2 inline-block transition-transform group-hover:translate-x-0.5 text-zinc-600">
                    →
                  </span>
                </Link>
                <Link
                  href="/boards"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50 px-6 text-[15px] font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                >
                  My boards
                </Link>
              </div>
            </motion.div>

            {/* Canvas preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.6, ease: EASE_OUT }}
              className="relative hidden lg:block"
            >
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
                {/* Window chrome */}
                <div className="mb-2 flex items-center justify-between px-2 py-1">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
                    <div className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
                    <div className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
                  </div>
                </div>

                {/* Canvas */}
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-zinc-800/50 bg-[#09090b]">
                  {/* Dot grid */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle, white 1px, transparent 1px)",
                      backgroundSize: "24px 24px",
                    }}
                  />

                  {/* Floating geometric elements for minimalist feel */}
                  <motion.div
                    animate={{ y: [-2, 2, -2] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute left-[20%] top-[25%] h-[72px] w-[120px] rounded-md border border-zinc-700 bg-zinc-800/20 backdrop-blur-sm"
                  />
                  <motion.div
                    animate={{ y: [2, -2, 2] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5,
                    }}
                    className="absolute right-[25%] top-[20%] h-[60px] w-[60px] rounded-full border border-zinc-700 bg-zinc-800/20 backdrop-blur-sm"
                  />
                  <motion.div
                    animate={{ y: [-1, 2, -1] }}
                    transition={{
                      duration: 4.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1,
                    }}
                    className="absolute bottom-[30%] left-[35%] h-[40px] w-[90px] rounded-md border border-zinc-700 bg-zinc-800/20 backdrop-blur-sm"
                  />

                  {/* Minimal connection line */}
                  <svg
                    className="absolute inset-0 h-full w-full opacity-30"
                    aria-hidden
                  >
                    <path
                      d="M 30% 35% C 40% 45%, 50% 25%, 65% 30%"
                      fill="none"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  </svg>

                  {/* Animated cursor */}
                  <motion.div
                    className="absolute"
                    initial={{ left: "45%", top: "50%" }}
                    animate={{
                      left: ["45%", "60%", "52%", "45%"],
                      top: ["50%", "35%", "45%", "50%"],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white drop-shadow-md"
                    >
                      <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                      <path d="m13 13 6 6" />
                    </svg>
                    <div className="mt-1 ml-4 rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
                      Guest
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Features ───────────────────────── */}
        <section className="grid gap-4 pb-16 md:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.45 + i * 0.1,
                duration: 0.4,
                ease: EASE_OUT,
              }}
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 transition-colors hover:bg-zinc-900/70"
            >
              <h3 className="text-[14px] font-medium text-white mb-2">
                {feature.label}
              </h3>
              <p className="text-[14px] leading-relaxed text-zinc-500">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </section>
      </div>
    </main>
  );
}
