import type { TLStoreSnapshot } from "@tldraw/editor";

export type BoardRole = "owner" | "editor";

export type BoardSnapshot = TLStoreSnapshot | null;

export interface AppSession {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified?: boolean;
  } | null;
  session: {
    id: string;
    expiresAt: string;
  } | null;
}

export interface BoardSummary {
  id: string;
  title: string;
  ownerUserId: string;
  role: BoardRole;
  shareLinkEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
}

export interface BoardDetail extends BoardSummary {
  snapshot: BoardSnapshot;
}

export interface InviteLink {
  id: string;
  boardId: string;
  token: string;
  url: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface PresenceUser {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  updatedAt: number;
}

export interface RealtimeTokenClaims {
  boardId: string;
  userId: string;
  name: string;
  color: string;
  role: BoardRole;
}

export interface RealtimeTokenResponse {
  boardId: string;
  token: string;
  websocketUrl: string;
  actor: {
    userId: string;
    name: string;
    color: string;
  };
}

export interface ApiErrorShape {
  error: string;
}

export interface CreateBoardInput {
  title?: string;
  snapshot?: BoardSnapshot;
}

export interface UpdateBoardInput {
  title: string;
}

export interface SaveGuestBoardInput {
  title?: string;
  snapshot: BoardSnapshot;
}

export interface AuthFormInput {
  email: string;
  password: string;
  name?: string;
  callbackURL?: string;
  rememberMe?: boolean;
}

export type RealtimeClientMessage =
  | {
      type: "snapshot";
      snapshot: BoardSnapshot;
    }
  | {
      type: "presence";
      presence: Pick<PresenceUser, "x" | "y">;
    };

export type RealtimeServerMessage =
  | {
      type: "init";
      snapshot: BoardSnapshot;
      peers: PresenceUser[];
    }
  | {
      type: "snapshot";
      snapshot: BoardSnapshot;
      authorUserId: string;
    }
  | {
      type: "presence";
      presence: PresenceUser;
    }
  | {
      type: "presence-remove";
      userId: string;
    }
  | {
      type: "error";
      message: string;
    };
