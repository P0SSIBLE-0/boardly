/// <reference types="@cloudflare/workers-types" />

import { createId } from "@paralleldrive/cuid2";
import {
  acceptShareLinkForUser,
  createBoardForUser,
  createShareLinkForUser,
  deleteBoardForUser,
  duplicateBoardForUser,
  getBoardForUser,
  listBoardsForUser,
} from "./data/boards";
import { createAuth } from "./auth";
import { badRequest, json, readJson } from "./lib/http";
import { colorFromId } from "./lib/colors";
import { createRealtimeToken } from "./lib/realtime";
import { requireSession } from "./lib/session";
import { BoardRoom } from "./realtime/board-room";
import type {
  CreateBoardInput,
  SaveGuestBoardInput,
  UpdateBoardInput,
} from "../shared/types";
import type { Env } from "./types";
import { updateBoardTitleForUser } from "./data/boards";

function trimPath(url: URL) {
  return url.pathname.replace(/\/+$/, "") || "/";
}

async function handleSession(request: Request, env: Env) {
  const session = await requireSession(request, env);

  if (!session) {
    return json({
      user: null,
      session: null,
    });
  }

  return json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      emailVerified: session.user.emailVerified,
    },
    session: {
      id: session.session.id,
      expiresAt: session.session.expiresAt.toISOString(),
    },
  });
}

function getBoardId(pathname: string) {
  return pathname.split("/")[3] ?? null;
}

function getInviteToken(pathname: string) {
  return pathname.split("/")[3] ?? null;
}

async function handleBoards(request: Request, env: Env, pathname: string) {
  const session = await requireSession(request, env);

  if (!session) {
    return badRequest("Authentication required", 401);
  }

  if (pathname === "/api/boards" && request.method === "GET") {
    const boards = await listBoardsForUser(env, session.user.id);
    return json(boards);
  }

  if (pathname === "/api/boards" && request.method === "POST") {
    const body = await readJson<CreateBoardInput | SaveGuestBoardInput>(request);
    const board = await createBoardForUser(env, {
      title: body.title?.trim() || "Untitled board",
      snapshot: body.snapshot ?? null,
      userId: session.user.id,
    });
    return json(board, { status: 201 });
  }

  const boardId = getBoardId(pathname);
  if (!boardId) {
    return badRequest("Board not found", 404);
  }

  if (pathname === `/api/boards/${boardId}` && request.method === "GET") {
    const board = await getBoardForUser(env, boardId, session.user.id);
    return board ? json(board) : badRequest("Board not found", 404);
  }

  if (pathname === `/api/boards/${boardId}` && request.method === "PATCH") {
    const body = await readJson<UpdateBoardInput>(request);
    const board = await updateBoardTitleForUser(
      env,
      boardId,
      session.user.id,
      body.title.trim() || "Untitled board",
    );

    return board ? json(board) : badRequest("Board not found", 404);
  }

  if (pathname === `/api/boards/${boardId}` && request.method === "DELETE") {
    const deleted = await deleteBoardForUser(env, boardId, session.user.id);
    return deleted
      ? json({ success: true })
      : badRequest("Only the board owner can delete this board", 403);
  }

  if (
    pathname === `/api/boards/${boardId}/duplicate` &&
    request.method === "POST"
  ) {
    const board = await duplicateBoardForUser(env, boardId, session.user.id);
    return board ? json(board, { status: 201 }) : badRequest("Board not found", 404);
  }

  if (
    pathname === `/api/boards/${boardId}/share-links` &&
    request.method === "POST"
  ) {
    const inviteLink = await createShareLinkForUser(
      env,
      boardId,
      session.user.id,
    );

    return inviteLink
      ? json(inviteLink, { status: 201 })
      : badRequest("Board not found", 404);
  }

  if (
    pathname === `/api/boards/${boardId}/realtime-token` &&
    request.method === "POST"
  ) {
    const board = await getBoardForUser(env, boardId, session.user.id);

    if (!board) {
      return badRequest("Board not found", 404);
    }

    const token = await createRealtimeToken(env, {
      boardId,
      userId: session.user.id,
      name: session.user.name,
      color: colorFromId(session.user.id),
      role: board.role,
    });

    return json({
      boardId,
      token,
      websocketUrl: `${env.BOARDLY_WORKER_URL.replace(/^http/, "ws")}/realtime/${boardId}`,
      actor: {
        userId: session.user.id,
        name: session.user.name,
        color: colorFromId(session.user.id),
      },
    });
  }

  return badRequest("Unsupported board route", 404);
}

async function handleInvite(request: Request, env: Env, pathname: string) {
  const session = await requireSession(request, env);

  if (!session) {
    return badRequest("Authentication required", 401);
  }

  const token = getInviteToken(pathname);

  if (!token) {
    return badRequest("Invite not found", 404);
  }

  const boardId = await acceptShareLinkForUser(env, token, session.user.id);

  return boardId
    ? json({ success: true, boardId })
    : badRequest("Invite link is invalid or expired", 404);
}

async function routeApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const pathname = trimPath(url);

  if (pathname.startsWith("/api/auth")) {
    const auth = createAuth(env);
    return auth.handler(request);
  }

  if (pathname === "/api/session") {
    return handleSession(request, env);
  }

  if (pathname.startsWith("/api/boards")) {
    return handleBoards(request, env, pathname);
  }

  if (pathname.startsWith("/api/invites")) {
    return handleInvite(request, env, pathname);
  }

  return badRequest("Route not found", 404);
}

const worker = {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const pathname = trimPath(url);

    if (pathname.startsWith("/realtime/")) {
      const boardId = pathname.split("/").at(-1);

      if (!boardId) {
        return badRequest("Realtime room not found", 404);
      }

      const id = env.BOARD_ROOM.idFromName(boardId);
      const stub = env.BOARD_ROOM.get(id);
      return stub.fetch(request);
    }

    if (pathname === "/health") {
      return json({ ok: true, requestId: createId() });
    }

    return routeApi(request, env);
  },
};

export default worker;

export { BoardRoom };
