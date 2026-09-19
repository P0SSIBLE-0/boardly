import type {
  AppSession,
  AuthFormInput,
  BoardDetail,
  BoardSnapshot,
  BoardSummary,
  InviteLink,
  RealtimeTokenResponse,
} from "@/shared/types";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "";

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

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiRequestError(
      `Unexpected response from server (status ${response.status}).`,
      response.status,
    );
  }
}

export async function apiRequest<T>(input: string, init?: RequestInit, useWorker = false) {
  // Prefer the Next.js same-origin `/api/*` proxy so auth cookies, CORS,
  // and env config stay consistent. Direct worker calls are opt-in legacy.
  const url = useWorker && WORKER_URL ? `${WORKER_URL}${input}` : input;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    // `fetch` throws TypeError: Failed to fetch on network errors / worker down.
    const message =
      error instanceof Error && /failed to fetch|network|load failed/i.test(error.message)
        ? "Cannot reach the server. Start the worker (`npm run dev:worker`) and set BOARDLY_WORKER_URL, then try again."
        : error instanceof Error
          ? error.message
          : "Network request failed.";
    throw new ApiRequestError(message, 0);
  }

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
  });
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
  });
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
  });
}

export function signOut() {
  return apiRequest("/api/auth/sign-out", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getBoards() {
  return apiRequest<BoardSummary[]>("/api/boards", {
    method: "GET",
  });
}

export function createBoard(input: {
  title?: string;
  snapshot?: BoardSnapshot;
}) {
  return apiRequest<BoardDetail>("/api/boards", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getBoard(boardId: string) {
  return apiRequest<BoardDetail>(`/api/boards/${boardId}`, {
    method: "GET",
  });
}

export function updateBoard(boardId: string, title: string) {
  return apiRequest<BoardDetail>(`/api/boards/${boardId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export function duplicateBoard(boardId: string) {
  return apiRequest<BoardDetail>(`/api/boards/${boardId}/duplicate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function deleteBoard(boardId: string) {
  return apiRequest<{ success: boolean }>(`/api/boards/${boardId}`, {
    method: "DELETE",
  });
}

export function createShareLink(boardId: string) {
  return apiRequest<InviteLink>(`/api/boards/${boardId}/share-links`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function acceptInvite(token: string) {
  return apiRequest<{ success: boolean; boardId: string }>(
    `/api/invites/${token}/accept`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function getRealtimeToken(boardId: string) {
  return apiRequest<RealtimeTokenResponse>(
    `/api/boards/${boardId}/realtime-token`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}
