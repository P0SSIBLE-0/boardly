import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, isNull } from "drizzle-orm";
import { createDb } from "../db/client";
import {
  boardDocuments,
  boardMembers,
  boardShareLinks,
  boards,
} from "../db/schema";
import type {
  BoardDetail,
  BoardSnapshot,
  BoardSummary,
  InviteLink,
} from "../../shared/types";
import type { Env } from "../types";

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function parseSnapshot(value: string | null): BoardSnapshot {
  if (!value) {
    return null;
  }

  return JSON.parse(value) as BoardSnapshot;
}

function formatBoardSummary(row: {
  board: typeof boards.$inferSelect;
  member: typeof boardMembers.$inferSelect;
}): BoardSummary {
  return {
    id: row.board.id,
    title: row.board.title,
    ownerUserId: row.board.ownerUserId,
    role: row.member.role,
    shareLinkEnabled: row.board.shareLinkEnabled,
    createdAt: row.board.createdAt.toISOString(),
    updatedAt: row.board.updatedAt.toISOString(),
    lastOpenedAt: toIso(row.board.lastOpenedAt),
  };
}

export async function listBoardsForUser(env: Env, userId: string) {
  const db = createDb(env);
  const rows = await db
    .select({
      board: boards,
      member: boardMembers,
    })
    .from(boardMembers)
    .innerJoin(boards, eq(boardMembers.boardId, boards.id))
    .where(eq(boardMembers.userId, userId))
    .orderBy(desc(boards.updatedAt));

  return rows.map(formatBoardSummary);
}

export async function getBoardForUser(
  env: Env,
  boardId: string,
  userId: string,
): Promise<BoardDetail | null> {
  const db = createDb(env);
  const rows = await db
    .select({
      board: boards,
      member: boardMembers,
      document: boardDocuments,
    })
    .from(boardMembers)
    .innerJoin(boards, eq(boardMembers.boardId, boards.id))
    .leftJoin(boardDocuments, eq(boardDocuments.boardId, boards.id))
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const now = new Date();
  await db
    .update(boards)
    .set({
      lastOpenedAt: now,
      updatedAt: now,
    })
    .where(eq(boards.id, boardId));

  return {
    ...formatBoardSummary({
      board: {
        ...row.board,
        lastOpenedAt: now,
        updatedAt: now,
      },
      member: row.member,
    }),
    snapshot: parseSnapshot(row.document?.snapshotJson ?? null),
  };
}

export async function createBoardForUser(
  env: Env,
  input: {
    title: string;
    snapshot: BoardSnapshot;
    userId: string;
  },
) {
  const db = createDb(env);
  const now = new Date();
  const boardId = createId();

  await db.insert(boards).values({
    id: boardId,
    title: input.title,
    ownerUserId: input.userId,
    shareLinkEnabled: false,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  });

  await db.insert(boardMembers).values({
    id: createId(),
    boardId,
    userId: input.userId,
    role: "owner",
    createdAt: now,
  });

  await db.insert(boardDocuments).values({
    boardId,
    snapshotJson: JSON.stringify(input.snapshot ?? null),
    version: 1,
    updatedAt: now,
  });

  return getBoardForUser(env, boardId, input.userId);
}

export async function updateBoardTitleForUser(
  env: Env,
  boardId: string,
  userId: string,
  title: string,
) {
  const db = createDb(env);
  const current = await getBoardForUser(env, boardId, userId);

  if (!current) {
    return null;
  }

  const now = new Date();
  await db
    .update(boards)
    .set({
      title,
      updatedAt: now,
    })
    .where(eq(boards.id, boardId));

  return getBoardForUser(env, boardId, userId);
}

export async function duplicateBoardForUser(
  env: Env,
  boardId: string,
  userId: string,
) {
  const board = await getBoardForUser(env, boardId, userId);

  if (!board) {
    return null;
  }

  return createBoardForUser(env, {
    title: `${board.title} copy`,
    snapshot: board.snapshot,
    userId,
  });
}

export async function deleteBoardForUser(
  env: Env,
  boardId: string,
  userId: string,
) {
  const db = createDb(env);
  const detail = await getBoardForUser(env, boardId, userId);

  if (!detail || detail.ownerUserId !== userId) {
    return false;
  }

  await db
    .delete(boardShareLinks)
    .where(eq(boardShareLinks.boardId, boardId));
  await db.delete(boardMembers).where(eq(boardMembers.boardId, boardId));
  await db
    .delete(boardDocuments)
    .where(eq(boardDocuments.boardId, boardId));
  await db.delete(boards).where(eq(boards.id, boardId));

  return true;
}

export async function createShareLinkForUser(
  env: Env,
  boardId: string,
  userId: string,
): Promise<InviteLink | null> {
  const db = createDb(env);
  const detail = await getBoardForUser(env, boardId, userId);

  if (!detail) {
    return null;
  }

  const now = new Date();
  const token = createId();
  const shareLinkId = createId();

  await db.insert(boardShareLinks).values({
    id: shareLinkId,
    boardId,
    token,
    createdByUserId: userId,
    createdAt: now,
    revokedAt: null,
  });

  await db
    .update(boards)
    .set({
      shareLinkEnabled: true,
      updatedAt: now,
    })
    .where(eq(boards.id, boardId));

  return {
    id: shareLinkId,
    boardId,
    token,
    url: `${env.BOARDLY_APP_URL}/invite/${token}`,
    createdAt: now.toISOString(),
    revokedAt: null,
  };
}

export async function acceptShareLinkForUser(
  env: Env,
  token: string,
  userId: string,
) {
  const db = createDb(env);
  const rows = await db
    .select({
      shareLink: boardShareLinks,
      board: boards,
    })
    .from(boardShareLinks)
    .innerJoin(boards, eq(boardShareLinks.boardId, boards.id))
    .where(and(eq(boardShareLinks.token, token), isNull(boardShareLinks.revokedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const existingMember = await db
    .select()
    .from(boardMembers)
    .where(
      and(
        eq(boardMembers.boardId, row.shareLink.boardId),
        eq(boardMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!existingMember[0]) {
    await db.insert(boardMembers).values({
      id: createId(),
      boardId: row.shareLink.boardId,
      userId,
      role: "editor",
      createdAt: new Date(),
    });
  }

  return row.shareLink.boardId;
}

export async function persistBoardSnapshot(
  env: Env,
  boardId: string,
  snapshot: BoardSnapshot,
) {
  const db = createDb(env);
  const now = new Date();
  const existing = await db
    .select()
    .from(boardDocuments)
    .where(eq(boardDocuments.boardId, boardId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(boardDocuments)
      .set({
        snapshotJson: JSON.stringify(snapshot ?? null),
        version: existing[0].version + 1,
        updatedAt: now,
      })
      .where(eq(boardDocuments.boardId, boardId));
  } else {
    await db.insert(boardDocuments).values({
      boardId,
      snapshotJson: JSON.stringify(snapshot ?? null),
      version: 1,
      updatedAt: now,
    });
  }

  await db
    .update(boards)
    .set({
      updatedAt: now,
    })
    .where(eq(boards.id, boardId));
}

export async function loadBoardSnapshot(env: Env, boardId: string) {
  const db = createDb(env);
  const rows = await db
    .select()
    .from(boardDocuments)
    .where(eq(boardDocuments.boardId, boardId))
    .limit(1);

  return parseSnapshot(rows[0]?.snapshotJson ?? null);
}
