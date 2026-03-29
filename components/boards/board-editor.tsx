"use client";

import {
  Editor,
  getSnapshot,
  loadSnapshot,
  Tldraw,
} from "tldraw";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEffectEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
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
  BoardSnapshot,
  PresenceUser,
  RealtimeServerMessage,
} from "@/shared/types";

type BoardMode = "guest" | "board";

const SHORTCUTS = [
  { key: "V", label: "Select" },
  { key: "D", label: "Draw" },
  { key: "R", label: "Rectangle" },
  { key: "O", label: "Ellipse" },
  { key: "A", label: "Arrow" },
  { key: "T", label: "Text" },
  { key: "Ctrl/Cmd Z", label: "Undo" },
];

const GUEST_BOARD_TITLE = "Saved guest board";

export function BoardEditor({
  mode,
  boardId,
}: {
  mode: BoardMode;
  boardId?: string;
}) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<BoardSnapshot>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("Starting board...");
  const [title, setTitle] = useState("Untitled board");
  const [peers, setPeers] = useState<Record<string, PresenceUser>>({});
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [statusVisible, setStatusVisible] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const latestMode = useRef(mode);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    let active = true;

    if (mode === "guest") {
      void getSession()
        .then((nextSession) => {
          if (!active) {
            return;
          }

          setSession(nextSession);
          setInitialSnapshot(loadGuestSnapshot());
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
          setInitialSnapshot(nextBoard.snapshot);
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

  const applyRemoteSnapshot = useEffectEvent((snapshot: BoardSnapshot) => {
    if (!editor || !snapshot) {
      return;
    }

    editor.store.mergeRemoteChanges(() => {
      loadSnapshot(editor.store, snapshot);
    });
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const removeStoreListener = editor.store.listen(
      () => {
        const snapshot = getSnapshot(editor.store).document;

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
      },
      { source: "user", scope: "document" },
    );

    const container = editor.getContainer();
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
      const bounds = container.getBoundingClientRect();

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
      removeStoreListener();
      container.removeEventListener("pointermove", handlePointerMove);
    };
  }, [editor]);

  useEffect(() => {
    if (mode !== "board" || !editor || !boardId || !session?.user) {
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
  }, [boardId, editor, mode, session?.user]);

  const peerList = useMemo(() => Object.values(peers), [peers]);

  async function saveGuestBoard() {
    if (!editor) {
      return null;
    }

    if (!session?.user) {
      window.location.href = "/sign-in?redirectTo=/whiteboard";
      return null;
    }

    flashStatus("Saving guest board...");
    const snapshot = getSnapshot(editor.store).document;
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
    if (!editor) {
      return;
    }

    const shapeIds = [...editor.getCurrentPageShapeIds()];
    if (shapeIds.length === 0) {
      flashStatus("Add something to the board before exporting.");
      return;
    }

    const image = await editor.toImage(shapeIds, {
      format: "png",
      background: true,
    });

    const url = URL.createObjectURL(image.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(title || "board").replace(/\s+/g, "-").toLowerCase()}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted/40">
        <div className="text-center">
          <svg
            className="mx-auto h-6 w-6 animate-spin text-muted-fg"
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
          <p className="mt-3 text-sm text-muted-fg">Preparing the whiteboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="z-50 shrink-0 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 sm:py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={mode === "guest" ? "/" : "/boards"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-fg transition hover:bg-muted hover:text-foreground"
              title="Back"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </Link>

            <div className="mx-1 h-4 w-px shrink-0 bg-border" />

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
                className="h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-foreground outline-none transition hover:border-border focus:border-border focus:bg-muted/50"
              />
            ) : (
              <span className="px-2 text-sm font-medium text-muted-fg">
                Guest board
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-between">
            <div className="flex min-h-8 flex-wrap items-center gap-2">
              {peerList.length > 0 ? (
                <>
                  <div className="hidden items-center -space-x-1.5 sm:flex">
                    {peerList.slice(0, 5).map((peer) => (
                      <div
                        key={peer.userId}
                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-elevated text-[10px] font-semibold text-white"
                        style={{ backgroundColor: peer.color }}
                        title={peer.name}
                      >
                        {peer.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                    ))}
                    {peerList.length > 5 ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-elevated bg-muted text-[10px] font-semibold text-muted-fg">
                        +{peerList.length - 5}
                      </div>
                    ) : null}
                  </div>
                  <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-fg sm:hidden">
                    {peerList.length} live
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
              <button
                type="button"
                onClick={() => {
                  void handleExportPng();
                }}
                className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                Export
              </button>
              {mode === "board" ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleCreateShareLink();
                  }}
                  className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background transition hover:bg-accent-hover"
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
                    className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background transition hover:bg-accent-hover"
                  >
                    {session?.user ? "Save to account" : "Sign in to save"}
                  </button>
                  {session?.user ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handleShareGuestBoard();
                      }}
                      className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
                    >
                      Share
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex-1">
        <Tldraw
          key={`${mode}-${boardId ?? "guest"}`}
          snapshot={initialSnapshot ?? undefined}
          onMount={(mountedEditor) => {
            setEditor(mountedEditor);
          }}
        />

        {peerList.map((peer) => (
          <div
            key={peer.userId}
            className="pointer-events-none absolute z-20 transition-all duration-75 ease-linear"
            style={{ left: peer.x, top: peer.y }}
          >
            <svg
              width="14"
              height="18"
              viewBox="0 0 16 20"
              fill="none"
              className="drop-shadow-sm"
            >
              <path d="M0 0L16 12L8 12L4 20L0 0Z" fill={peer.color} />
            </svg>
            <span
              className="ml-3 mt-1 inline-block whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background shadow-xs"
              style={{ backgroundColor: peer.color }}
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
              className="absolute bottom-24 left-1/2 z-30 w-[calc(100%-2rem)] max-w-max -translate-x-1/2 rounded-2xl border border-border bg-background/95 px-4 py-2 text-center text-xs font-medium text-foreground shadow-sm backdrop-blur-md sm:bottom-20 sm:w-auto sm:rounded-full"
            >
              {status}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {mode === "guest" && !statusVisible ? (
          <div className="absolute bottom-24 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-border bg-background/95 px-4 py-2 text-center text-xs font-medium text-muted-fg shadow-sm backdrop-blur-md sm:bottom-20 sm:max-w-max sm:rounded-full">
            <span>Cached in browser.</span>
            <button
              type="button"
              onClick={() => {
                void handleSaveGuestBoard();
              }}
              className="text-foreground transition hover:underline"
            >
              {session?.user ? "Save to account" : "Sign in to save"}
            </button>
            {session?.user ? (
              <>
                <span className="hidden text-border sm:inline">|</span>
                <button
                  type="button"
                  onClick={() => {
                    void handleShareGuestBoard();
                  }}
                  className="text-foreground transition hover:underline"
                >
                  Share
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        <AnimatePresence>
          {showShortcuts ? (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-14 right-3 z-40 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-elevated p-4 shadow-lg sm:right-4 sm:w-52"
            >
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-fg">
                Shortcuts
              </p>
              <div className="space-y-2">
                {SHORTCUTS.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[13px] text-foreground">
                      {shortcut.label}
                    </span>
                    <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-fg">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>

              {board ? (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg">
                    Board
                  </p>
                  <p className="mt-1.5 text-[12px] text-muted-fg">
                    Role: {board.role}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-fg">
                    Updated: {new Date(board.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="absolute bottom-4 right-3 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated text-sm font-medium text-muted-fg shadow-sm transition hover:bg-muted hover:text-foreground sm:right-4 sm:h-9 sm:w-9"
          title="Keyboard shortcuts"
        >
          ?
        </button>
      </div>
    </main>
  );
}
