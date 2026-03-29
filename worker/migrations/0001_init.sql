CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS user_email_unique ON user(email);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL,
  token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS session_token_unique ON session(token);
CREATE INDEX IF NOT EXISTS session_user_idx ON session(user_id);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  password TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS account_provider_account_unique
ON account(provider_id, account_id);
CREATE INDEX IF NOT EXISTS account_user_idx ON account(user_id);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS verification_identifier_idx
ON verification(identifier);

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  share_link_enabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_opened_at INTEGER,
  FOREIGN KEY (owner_user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS boards_owner_idx ON boards(owner_user_id);

CREATE TABLE IF NOT EXISTS board_documents (
  board_id TEXT PRIMARY KEY NOT NULL,
  snapshot_json TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS board_members (
  id TEXT PRIMARY KEY NOT NULL,
  board_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS board_members_board_user_unique
ON board_members(board_id, user_id);
CREATE INDEX IF NOT EXISTS board_members_board_idx ON board_members(board_id);
CREATE INDEX IF NOT EXISTS board_members_user_idx ON board_members(user_id);

CREATE TABLE IF NOT EXISTS board_share_links (
  id TEXT PRIMARY KEY NOT NULL,
  board_id TEXT NOT NULL,
  token TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS board_share_links_token_unique
ON board_share_links(token);
CREATE INDEX IF NOT EXISTS board_share_links_board_idx
ON board_share_links(board_id);
