import type { BoardSnapshot } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFabricCanvasJSON(value: unknown): value is BoardSnapshot {
  if (!isObject(value)) {
    return false;
  }
  return "objects" in value && Array.isArray(value.objects);
}

export function normalizeBoardSnapshot(snapshot: unknown): BoardSnapshot {
  if (isFabricCanvasJSON(snapshot)) {
    return snapshot;
  }

  if (!isObject(snapshot)) {
    return null;
  }

  if ("document" in snapshot) {
    const legacySnapshot = snapshot as { document?: unknown };
    return isFabricCanvasJSON(legacySnapshot.document)
      ? legacySnapshot.document
      : null;
  }

  if ("store" in snapshot || "schema" in snapshot) {
    return null;
  }

  return null;
}
