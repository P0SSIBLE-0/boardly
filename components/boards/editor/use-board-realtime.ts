"use client";

import { useEffect, useRef, useCallback } from "react";
import type { BoardSnapshot, PresenceUser, RealtimeServerMessage, RealtimeClientMessage } from "@/shared/types";
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
  const setPeers = useEditorStore((state) => state.setPeers);

  const broadcastSnapshot = useCallback((snapshot: BoardSnapshot) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: RealtimeClientMessage = {
        type: "snapshot",
        snapshot,
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (mode === "guest" || !boardId) return;

    let socket: WebSocket | null = null;
    let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
    let unmounted = false;

    async function connectRealtime() {
      try {
        const { token } = await getRealtimeToken(boardId as string);
        if (unmounted) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/realtime?boardId=${boardId}&token=${token}`;
        socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as RealtimeServerMessage;
            if (message.type === "init") {
              const peersMap: Record<string, PresenceUser> = {};
              message.peers.forEach((peer) => {
                peersMap[peer.userId] = peer;
              });
              setPeers(peersMap);
              if (message.snapshot) {
                onRemoteSnapshot(message.snapshot);
              }
            } else if (message.type === "presence") {
              setPeers((prev) => ({
                ...prev,
                [message.presence.userId]: message.presence,
              }));
            } else if (message.type === "presence-remove") {
              setPeers((prev) => {
                const next = { ...prev };
                delete next[message.userId];
                return next;
              });
            } else if (message.type === "snapshot") {
              onRemoteSnapshot(message.snapshot);
            }
          } catch {
            // ignore malformed message
          }
        };

        keepAliveTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      } catch (error) {
        console.error("Realtime connection error", error);
      }
    }

    void connectRealtime();

    return () => {
      unmounted = true;
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      if (socket) {
        try {
          socket.close();
        } catch {
          // ignore
        }
      }
      socketRef.current = null;
    };
  }, [boardId, mode, onRemoteSnapshot, setPeers]);

  return { broadcastSnapshot };
}
