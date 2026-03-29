"use client";

import { useEffect, useId } from "react";
import { AnimatePresence, motion } from "motion/react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id={titleId}
                  className="text-lg font-semibold tracking-tight text-foreground"
                >
                  {title}
                </h2>
                {description ? (
                  <p
                    id={descriptionId}
                    className="mt-2 text-sm leading-6 text-muted-fg"
                  >
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-fg transition hover:bg-muted hover:text-foreground"
                aria-label="Close dialog"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {children ? <div className="mt-5">{children}</div> : null}
            {footer ? (
              <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
