"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { acceptInvite, getSession } from "@/lib/api";

type InviteState = "checking" | "joining" | "error";

export function InviteClient({ token }: { token: string }) {
  const [state, setState] = useState<InviteState>("checking");
  const [message, setMessage] = useState("Verifying your session…");

  useEffect(() => {
    let active = true;

    void getSession()
      .then((session) => {
        if (!active) {
          return;
        }

        if (!session.user) {
          window.location.href = `/sign-in?redirectTo=${encodeURIComponent(`/invite/${token}`)}`;
          return;
        }

        setState("joining");
        setMessage("Joining board…");
        return acceptInvite(token).then((result) => {
          if (!active) {
            return;
          }

          window.location.href = `/boards/${result.boardId}`;
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "This invite could not be used.",
        );
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/50 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm text-center"
      >
        <div className="rounded-2xl border border-border bg-elevated p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          {/* Status indicator */}
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {state === "error" ? (
              <svg
                className="h-6 w-6 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 animate-spin text-muted-fg"
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
            )}
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {state === "error" ? "Invite failed" : "Opening shared board"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-fg">
            {message}
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Back home
            </Link>
            {state === "error" && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
