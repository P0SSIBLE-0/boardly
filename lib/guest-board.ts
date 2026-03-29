import type { BoardSnapshot } from "@/shared/types";
import { normalizeBoardSnapshot } from "@/shared/snapshots";

const SNAPSHOT_KEY = "boardly:guest:snapshot";

export function loadGuestSnapshot(): BoardSnapshot {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(SNAPSHOT_KEY);
  return value ? normalizeBoardSnapshot(JSON.parse(value)) : null;
}

export function saveGuestSnapshot(snapshot: BoardSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    SNAPSHOT_KEY,
    JSON.stringify(normalizeBoardSnapshot(snapshot)),
  );
}

export function clearGuestSnapshot() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(SNAPSHOT_KEY);
}
