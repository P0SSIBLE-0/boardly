/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  BOARD_ROOM: DurableObjectNamespace;
  BETTER_AUTH_SECRET: string;
  BOARDLY_APP_URL: string;
  BOARDLY_WORKER_URL: string;
  REALTIME_SECRET?: string;
}
