"use client";

import { useEffect, useRef, useCallback } from "react";
import type {
  BoardSnapshot,
  PresenceUser,
  RealtimeServerMessage,
  RealtimeClientMessage,
} from "@/shared/types";
import { getRealtimeToken } from "@/lib/api";
import type { BoardMode } from "./editor-types";
import { useEditorStore } from "./use-editor-store";

interface UseBoardRealtimeOptions {
  boardId?: string;
  mode: BoardMode;
  onRemoteSnapshot: (snapshot: BoardSnapshot) => void;
}

export function useBoardRealtime({
  boardId,
  mode,
  onRemoteSnapshot,
}: UseBoardRealtimeOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const onRemoteSnapshotRef = useRef(onRemoteSnapshot);
  const lastPresenceSentRef = useRef(0);

  useEffect(() => {
    onRemoteSnapshotRef.current = onRemoteSnapshot;
  }, [onRemoteSnapshot]);

  const broadcastSnapshot = useCallback((snapshot: BoardSnapshot) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: RealtimeClientMessage = {
        type: "snapshot",
        snapshot,
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const broadcastPresence = useCallback((x: number, y: number) => {
    const now = Date.now();
    // Throttle to max 25 updates/sec (40ms)
    if (now - lastPresenceSentRef.current < 40) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      lastPresenceSentRef.current = now;
      const message: RealtimeClientMessage = {
        type: "presence",
        presence: { x, y },
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (mode === "guest" || !boardId) return;

    let socket: WebSocket | null = null;
    let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    async function connectRealtime() {
      if (unmounted) return;
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

      try {
        const res = await getRealtimeToken(boardId as string);
        if (unmounted) return;

        let targetWsUrl = res.websocketUrl;
        if (!targetWsUrl) {
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          targetWsUrl = `${protocol}//${window.location.hostname}:8787/realtime/${boardId}`;
        } else {
          try {
            const urlObj = new URL(targetWsUrl);
            if (
              (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") &&
              window.location.hostname
            ) {
              urlObj.hostname = window.location.hostname;
              targetWsUrl = urlObj.toString();
            }
          } catch {
            // ignore
          }
        }

        const wsUrl = `${targetWsUrl}${targetWsUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(res.token)}`;
        socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log("[realtime] Connected to board room:", boardId);
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as RealtimeServerMessage;
            if (message.type === "init") {
              const peersMap: Record<string, PresenceUser> = {};
              message.peers.forEach((peer) => {
                peersMap[peer.userId] = peer;
              });
              useEditorStore.getState().setPeers(peersMap);
              if (message.snapshot) {
                onRemoteSnapshotRef.current(message.snapshot);
              }
            } else if (message.type === "presence") {
              useEditorStore.getState().setPeers((prev) => ({
                ...prev,
                [message.presence.userId]: message.presence,
              }));
            } else if (message.type === "presence-remove") {
              useEditorStore.getState().setPeers((prev) => {
                const next = { ...prev };
                delete next[message.userId];
                return next;
              });
            } else if (message.type === "snapshot") {
              onRemoteSnapshotRef.current(message.snapshot);
            }
          } catch {
            // ignore malformed message
          }
        };

        socket.onclose = (event) => {
          socketRef.current = null;
          if (!unmounted && mode !== "guest" && event.code !== 1000) {
            reconnectTimer = setTimeout(() => {
              if (!unmounted) void connectRealtime();
            }, 2500);
          }
        };

        socket.onerror = (err) => {
          console.error("[realtime] WebSocket error:", err);
        };

        keepAliveTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      } catch (error) {
        console.error("[realtime] Setup error:", error);
        if (!unmounted && mode !== "guest") {
          reconnectTimer = setTimeout(() => {
            if (!unmounted) void connectRealtime();
          }, 3000);
        }
      }
    }

    void connectRealtime();

    return () => {
      unmounted = true;
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        try {
          socket.close(1000, "cleanup");
        } catch {
          // ignore
        }
      }
      socketRef.current = null;
    };
  }, [boardId, mode]);

  return { broadcastSnapshot, broadcastPresence };
}
