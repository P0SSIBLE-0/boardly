import { SCHEMA_STATEMENTS } from "./init-sql";

let isInitialized = false;

export async function ensureDbInitialized(d1: D1Database): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    const table = await d1
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user'")
      .first();

    if (!table) {
      console.log("[db] Initializing D1 tables...");
      for (const statement of SCHEMA_STATEMENTS) {
        const cleanSql = statement.trim().replace(/;+$/, "");
        if (cleanSql) {
          await d1.prepare(cleanSql).run();
        }
      }
      console.log("[db] D1 tables initialized successfully.");
    }
    isInitialized = true;
  } catch (error) {
    console.error("[db] Error ensuring D1 tables:", error);
  }
}
