import { createId } from "@paralleldrive/cuid2";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { createDb } from "./db/client";
import { schema } from "./db/schema";
import { hashPassword, verifyPassword } from "./lib/password";
import type { Env } from "./types";

function getAllowedAuthHosts(env: Env) {
  return Array.from(
    new Set([
      new URL(env.BOARDLY_APP_URL).host,
      new URL(env.BOARDLY_WORKER_URL).host,
    ]),
  );
}

export function createAuth(env: Env) {
  const db = createDb(env);

  return betterAuth({
    appName: "Boardly",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: {
      allowedHosts: getAllowedAuthHosts(env),
      fallback: env.BOARDLY_APP_URL,
      protocol: "auto",
    },
    basePath: "/api/auth",
    trustedOrigins: [env.BOARDLY_APP_URL, env.BOARDLY_WORKER_URL],
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
