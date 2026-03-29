import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    image: text("image"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    emailIndex: uniqueIndex("user_email_unique").on(table.email),
  }),
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    tokenIndex: uniqueIndex("session_token_unique").on(table.token),
    userIndex: index("session_user_idx").on(table.userId),
  }),
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    accountIndex: uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    accountUserIndex: index("account_user_idx").on(table.userId),
  }),
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
  },
  (table) => ({
    verificationIndex: index("verification_identifier_idx").on(table.identifier),
  }),
);

export const boards = sqliteTable(
  "boards",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    shareLinkEnabled: integer("share_link_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    lastOpenedAt: integer("last_opened_at", { mode: "timestamp_ms" }),
  },
  (table) => ({
    ownerIndex: index("boards_owner_idx").on(table.ownerUserId),
  }),
);

export const boardDocuments = sqliteTable("board_documents", {
  boardId: text("board_id")
    .primaryKey()
    .references(() => boards.id, { onDelete: "cascade" }),
  snapshotJson: text("snapshot_json"),
  version: integer("version").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const boardMembers = sqliteTable(
  "board_members",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "editor"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    membershipUnique: uniqueIndex("board_members_board_user_unique").on(
      table.boardId,
      table.userId,
    ),
    boardIndex: index("board_members_board_idx").on(table.boardId),
    userIndex: index("board_members_user_idx").on(table.userId),
  }),
);

export const boardShareLinks = sqliteTable(
  "board_share_links",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  },
  (table) => ({
    tokenUnique: uniqueIndex("board_share_links_token_unique").on(table.token),
    boardIndex: index("board_share_links_board_idx").on(table.boardId),
  }),
);

export const schema = {
  account,
  boardDocuments,
  boardMembers,
  boardShareLinks,
  boards,
  session,
  user,
  verification,
};

export type AppSchema = typeof schema;
