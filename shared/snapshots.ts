import type { BoardSnapshot } from "./types";
import type { TLStoreSnapshot } from "@tldraw/editor";

type LegacySnapshotShape = {
  document?: unknown;
  session?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStoreSnapshot(value: unknown): value is TLStoreSnapshot {
  return isObject(value) && "store" in value && "schema" in value;
}

export function normalizeBoardSnapshot(snapshot: unknown): BoardSnapshot {
  if (isStoreSnapshot(snapshot)) {
    return snapshot;
  }

  if (!isObject(snapshot)) {
    return null;
  }

  if ("document" in snapshot) {
    const legacySnapshot = snapshot as LegacySnapshotShape;
    return isStoreSnapshot(legacySnapshot.document)
      ? legacySnapshot.document
      : null;
  }

  return null;
}
