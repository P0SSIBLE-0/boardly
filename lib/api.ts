import type {
  AppSession,
  AuthFormInput,
  BoardDetail,
  BoardSnapshot,
  BoardSummary,
  InviteLink,
  RealtimeTokenResponse,
} from "@/shared/types";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function parseResponse<T>(response: Response) {
  const text = await response.text();

  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

export async function apiRequest<T>(input: string, init?: RequestInit, useWorker = false) {
  const url = useWorker ? `${WORKER_URL}${input}` : input;
  const response = await fetch(url, {
    ...init,
    credentials: useWorker ? "include" : "same-origin",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await parseResponse<T | { error?: string }>(response);

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && data.error
        ? data.error
        : "Something went wrong.";
    throw new ApiRequestError(message, response.status);
  }

  return data as T;
}

export function getSession() {
  return apiRequest<AppSession>("/api/session", {
    method: "GET",
  }, true);
}

export function signInWithEmail(payload: AuthFormInput) {
  return apiRequest("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      callbackURL: payload.callbackURL,
      rememberMe: payload.rememberMe ?? true,
    }),
  }, true);
}

export function signUpWithEmail(payload: AuthFormInput) {
  return apiRequest("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      callbackURL: payload.callbackURL,
      rememberMe: payload.rememberMe ?? true,
    }),
  }, true);
}

export function signOut() {
  return apiRequest("/api/auth/sign-out", {
    method: "POST",
    body: JSON.stringify({}),
  }, true);
}

export function getBoards() {
  return apiRequest<BoardSummary[]>("/api/boards", {
    method: "GET",
  }, true);
}

export function createBoard(input: {
  title?: string;
  snapshot?: BoardSnapshot;
}) {
  return apiRequest<BoardDetail>("/api/boards", {
    method: "POST",
    body: JSON.stringify(input),
  }, true);
}

export function getBoard(boardId: string) {
  return apiRequest<BoardDetail>(`/api/boards/${boardId}`, {
    method: "GET",
  }, true);
}

export function updateBoard(boardId: string, title: string) {
  return apiRequest<BoardDetail>(`/api/boards/${boardId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  }, true);
}

export function duplicateBoard(boardId: string) {
  return apiRequest<BoardDetail>(`/api/boards/${boardId}/duplicate`, {
    method: "POST",
    body: JSON.stringify({}),
  }, true);
}

export function deleteBoard(boardId: string) {
  return apiRequest<{ success: boolean }>(`/api/boards/${boardId}`, {
    method: "DELETE",
  }, true);
}

export function createShareLink(boardId: string) {
  return apiRequest<InviteLink>(`/api/boards/${boardId}/share-links`, {
    method: "POST",
    body: JSON.stringify({}),
  }, true);
}

export function acceptInvite(token: string) {
  return apiRequest<{ success: boolean; boardId: string }>(
    `/api/invites/${token}/accept`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    true,
  );
}

export function getRealtimeToken(boardId: string) {
  return apiRequest<RealtimeTokenResponse>(
    `/api/boards/${boardId}/realtime-token`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    true,
  );
}
