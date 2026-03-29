/// <reference types="@cloudflare/workers-types" />

import type {
  PresenceUser,
  RealtimeClientMessage,
  RealtimeServerMessage,
} from "../../shared/types";
import { loadBoardSnapshot, persistBoardSnapshot } from "../data/boards";
import { verifyRealtimeToken } from "../lib/realtime";
import type { Env } from "../types";

type Connection = {
  socket: WebSocket;
  userId: string;
  name: string;
  color: string;
};

export class BoardRoom {
  private readonly connections = new Map<WebSocket, Connection>();

  private readonly presence = new Map<string, PresenceUser>();

  private snapshotLoaded = false;

  private snapshot: import("../../shared/types").BoardSnapshot = null;

  private persistHandle: number | null = null;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request) {
    const url = new URL(request.url);
    const boardId = url.pathname.split("/").at(-1);
    const token = url.searchParams.get("token");

    if (!boardId || !token) {
      return new Response("Missing realtime token", { status: 400 });
    }

    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const claims = await verifyRealtimeToken(this.env, token).catch(() => null);

    if (!claims || claims.boardId !== boardId) {
      return new Response("Invalid realtime token", { status: 401 });
    }

    if (!this.snapshotLoaded) {
      this.snapshot = await loadBoardSnapshot(this.env, boardId);
      this.snapshotLoaded = true;
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    const connection: Connection = {
      socket: server,
      userId: claims.userId,
      name: claims.name,
      color: claims.color,
    };

    this.connections.set(server, connection);
    this.bindSocket(boardId, server, connection);

    this.send(server, {
      type: "init",
      snapshot: this.snapshot,
      peers: Array.from(this.presence.values()),
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private bindSocket(boardId: string, socket: WebSocket, connection: Connection) {
    socket.addEventListener("message", (event) => {
      void this.handleMessage(boardId, socket, connection, event.data);
    });

    socket.addEventListener("close", () => {
      this.handleClose(boardId, socket, connection);
    });

    socket.addEventListener("error", () => {
      this.handleClose(boardId, socket, connection);
    });
  }

  private async handleMessage(
    boardId: string,
    socket: WebSocket,
    connection: Connection,
    raw: string | ArrayBuffer,
  ) {
    const message = JSON.parse(
      typeof raw === "string" ? raw : new TextDecoder().decode(raw),
    ) as RealtimeClientMessage;

    if (message.type === "snapshot") {
      this.snapshot = message.snapshot;
      this.broadcast(
        {
          type: "snapshot",
          snapshot: message.snapshot,
          authorUserId: connection.userId,
        },
        socket,
      );
      this.schedulePersist(boardId);
      return;
    }

    if (message.type === "presence") {
      const nextPresence: PresenceUser = {
        userId: connection.userId,
        name: connection.name,
        color: connection.color,
        x: message.presence.x,
        y: message.presence.y,
        updatedAt: Date.now(),
      };

      this.presence.set(connection.userId, nextPresence);
      this.broadcast({
        type: "presence",
        presence: nextPresence,
      });
    }
  }

  private handleClose(boardId: string, socket: WebSocket, connection: Connection) {
    this.connections.delete(socket);
    this.presence.delete(connection.userId);
    this.broadcast({
      type: "presence-remove",
      userId: connection.userId,
    });

    if (this.connections.size === 0) {
      void this.flushPersist(boardId);
    }
  }

  private schedulePersist(boardId: string) {
    if (this.persistHandle !== null) {
      clearTimeout(this.persistHandle);
    }

    this.persistHandle = setTimeout(() => {
      void this.flushPersist(boardId);
    }, 700) as unknown as number;
  }

  private async flushPersist(boardId: string) {
    if (this.persistHandle !== null) {
      clearTimeout(this.persistHandle);
      this.persistHandle = null;
    }

    await persistBoardSnapshot(this.env, boardId, this.snapshot);
  }

  private send(socket: WebSocket, message: RealtimeServerMessage) {
    socket.send(JSON.stringify(message));
  }

  private broadcast(message: RealtimeServerMessage, exclude?: WebSocket) {
    const payload = JSON.stringify(message);

    for (const { socket } of this.connections.values()) {
      if (socket === exclude) {
        continue;
      }

      socket.send(payload);
    }
  }
}
