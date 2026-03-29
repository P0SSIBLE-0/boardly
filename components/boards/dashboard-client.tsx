"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  deleteBoard,
  duplicateBoard,
  getBoards,
  getSession,
  signOut,
  updateBoard,
} from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import type { AppSession, BoardSummary } from "@/shared/types";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function BoardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-elevated p-5">
      <div className="skeleton h-3 w-16 rounded" />
      <div className="skeleton mt-3 h-5 w-3/4 rounded" />
      <div className="skeleton mt-4 h-3 w-1/2 rounded" />
      <div className="mt-5 flex gap-2">
        <div className="skeleton h-8 w-16 rounded-md" />
        <div className="skeleton h-8 w-16 rounded-md" />
      </div>
    </div>
  );
}

export function DashboardClient() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renameBoardId, setRenameBoardId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, setRenamePending] = useState(false);
  const [deleteBoardId, setDeleteBoardId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    let active = true;

    void Promise.all([getSession(), getBoards()])
      .then(([nextSession, nextBoards]) => {
        if (!active) {
          return;
        }

        if (!nextSession.user) {
          window.location.href = "/sign-in?redirectTo=/boards";
          return;
        }

        setSession(nextSession);
        setBoards(nextBoards);
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your boards.",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function openRenameModal(boardId: string) {
    const current = boards.find((board) => board.id === boardId);
    setRenameBoardId(boardId);
    setRenameValue(current?.title ?? "Untitled board");
  }

  async function handleRenameSubmit() {
    if (!renameBoardId) {
      return;
    }

    const title = renameValue.trim();
    if (!title) {
      return;
    }

    setRenamePending(true);

    try {
      const next = await updateBoard(renameBoardId, title);
      setBoards((currentBoards) =>
        currentBoards.map((board) =>
          board.id === renameBoardId ? next : board,
        ),
      );
      setRenameBoardId(null);
      setRenameValue("");
    } finally {
      setRenamePending(false);
    }
  }

  async function handleDuplicate(boardId: string) {
    const next = await duplicateBoard(boardId);
    setBoards((currentBoards) => [next, ...currentBoards]);
  }

  function openDeleteModal(boardId: string) {
    setDeleteBoardId(boardId);
  }

  async function handleDeleteConfirm() {
    if (!deleteBoardId) {
      return;
    }

    setDeletePending(true);

    try {
      await deleteBoard(deleteBoardId);
      setBoards((currentBoards) =>
        currentBoards.filter((board) => board.id !== deleteBoardId),
      );
      setDeleteBoardId(null);
    } finally {
      setDeletePending(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    window.location.href = "/";
  }

  const renameBoard = renameBoardId
    ? boards.find((board) => board.id === renameBoardId) ?? null
    : null;
  const boardToDelete = deleteBoardId
    ? boards.find((board) => board.id === deleteBoardId) ?? null
    : null;

  return (
    <>
      <main className="min-h-dvh bg-muted/40">
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-[15px] font-semibold tracking-tight text-foreground"
              >
                Boardly
              </Link>
              {session?.user ? (
                <>
                  <span className="text-muted-fg text-sm">/</span>
                  <span className="hidden text-sm font-medium text-foreground sm:inline">
                    {session.user.name}
                  </span>
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/whiteboard"
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Guest board
              </Link>
              <Link
                href="/whiteboard?upgrade=1"
                className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition hover:bg-accent-hover"
              >
                New board
              </Link>
              <button
                type="button"
                onClick={() => {
                  startTransition(() => {
                    void handleSignOut();
                  });
                }}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-fg transition hover:bg-muted hover:text-foreground"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Your boards
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              {boards.length > 0
                ? `${boards.length} board${boards.length === 1 ? "" : "s"}`
                : "Create or save a board to get started."}
            </p>
          </motion.div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-destructive-light px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              <svg
                className="h-4 w-4 shrink-0 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </motion.div>
          ) : null}

          {loading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <BoardSkeleton />
              <BoardSkeleton />
              <BoardSkeleton />
            </div>
          ) : boards.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease: EASE_OUT }}
              className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-16 text-center"
            >
              <h2 className="text-[15px] font-medium text-foreground">
                No boards yet
              </h2>
              <p className="mt-1 max-w-[240px] text-sm text-muted-fg">
                Create a new board or open a guest board to get started.
              </p>
              <Link
                href="/whiteboard"
                className="mt-5 inline-flex h-9 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition hover:bg-accent-hover"
              >
                Create new canvas
              </Link>
            </motion.div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {boards.map((board, i) => (
                <motion.article
                  key={board.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.06 * i,
                    duration: 0.35,
                    ease: EASE_OUT,
                  }}
                  className="group flex flex-col justify-between rounded-lg border border-border bg-elevated p-5 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-[15px] font-medium text-foreground transition-colors group-hover:text-accent-hover">
                          {board.title}
                        </h2>
                      </div>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          board.shareLinkEnabled
                            ? "bg-accent/10 text-accent-hover"
                            : "bg-muted text-muted-fg"
                        }`}
                      >
                        {board.shareLinkEnabled ? "Shared" : "Private"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium capitalize text-muted-fg">
                      {board.role}
                    </div>
                  </div>

                  <p className="mt-4 text-[12px] text-muted-fg">
                    Updated{" "}
                    {new Date(board.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/boards/${board.id}`}
                      className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition hover:bg-accent-hover"
                    >
                      Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => openRenameModal(board.id)}
                      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground transition hover:bg-muted"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        startTransition(() => {
                          void handleDuplicate(board.id);
                        });
                      }}
                      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground transition hover:bg-muted"
                    >
                      Duplicate
                    </button>
                    {board.role === "owner" ? (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(board.id)}
                        className="ml-auto inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </main>

      <Modal
        open={!!renameBoardId}
        title="Rename board"
        description="Give this board a clearer name. You can change it again any time."
        onClose={() => {
          if (!renamePending) {
            setRenameBoardId(null);
            setRenameValue("");
          }
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setRenameBoardId(null);
                setRenameValue("");
              }}
              disabled={renamePending}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void handleRenameSubmit();
              }}
              disabled={renamePending || !renameValue.trim()}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {renamePending ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-foreground">
            Board title
          </span>
          <input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && renameValue.trim() && !renamePending) {
                event.preventDefault();
                void handleRenameSubmit();
              }
            }}
            autoFocus
            className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground focus:bg-background"
            placeholder={renameBoard?.title ?? "Untitled board"}
          />
        </label>
      </Modal>

      <Modal
        open={!!deleteBoardId}
        title="Delete board"
        description={
          boardToDelete
            ? `Delete "${boardToDelete.title}" permanently? This action cannot be undone.`
            : "Delete this board permanently? This action cannot be undone."
        }
        onClose={() => {
          if (!deletePending) {
            setDeleteBoardId(null);
          }
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteBoardId(null)}
              disabled={deletePending}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void handleDeleteConfirm();
              }}
              disabled={deletePending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletePending ? "Deleting..." : "Delete board"}
            </button>
          </>
        }
      />
    </>
  );
}
