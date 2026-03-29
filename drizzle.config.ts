import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./worker/db/schema.ts",
  out: "./worker/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "local-account",
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID ?? "local-database",
    token: process.env.CLOUDFLARE_API_TOKEN ?? "local-token",
  },
});
