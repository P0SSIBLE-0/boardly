import { createId } from "@paralleldrive/cuid2";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { createDb } from "./db/client";
import { schema } from "./db/schema";
import { hashPassword, verifyPassword } from "./lib/password";
import type { Env } from "./types";

function getAllowedAuthHosts(env: Env) {
  const hosts = ["localhost:3000", "localhost:8787", "127.0.0.1:3000", "127.0.0.1:8787"];
  try {
    if (env.BOARDLY_APP_URL) hosts.push(new URL(env.BOARDLY_APP_URL).host);
    if (env.BOARDLY_WORKER_URL) hosts.push(new URL(env.BOARDLY_WORKER_URL).host);
  } catch {
    // Ignore invalid URL
  }
  return Array.from(new Set(hosts));
}

export function createAuth(env: Env) {
  const db = createDb(env);

  return betterAuth({
    appName: "Boardly",
    secret: env.BETTER_AUTH_SECRET || "boardly-local-dev-secret-key-1234567890",
    baseURL: {
      allowedHosts: getAllowedAuthHosts(env),
      fallback: env.BOARDLY_APP_URL || "http://localhost:3000",
      protocol: "auto",
    },
    basePath: "/api/auth",
    trustedOrigins: [
      env.BOARDLY_APP_URL,
      env.BOARDLY_WORKER_URL,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:8787",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:8787",
    ].filter(Boolean),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
    },
    advanced: {
      trustedProxyHeaders: true,
      database: {
        generateId: () => createId(),
      },
    },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
      transaction: false,
    }),
  });
}
