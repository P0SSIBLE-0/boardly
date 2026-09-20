"use client";

import type { PresenceUser } from "@/shared/types";
import type { FabricCanvas } from "./editor-types";

interface CollaboratorCursorsProps {
  peers: PresenceUser[];
  currentUserId?: string | null;
  canvas?: FabricCanvas | null;
}

export function CollaboratorCursors({
  peers,
  currentUserId,
  canvas,
}: CollaboratorCursorsProps) {
  if (!peers || peers.length === 0) return null;

  return (
    <>
      {peers.map((peer) => {
        // Do not render the user's own cursor
        if (currentUserId && peer.userId === currentUserId) {
          return null;
        }

        // Skip uninitialized or invalid coordinates
        if (
          typeof peer.x !== "number" ||
          typeof peer.y !== "number" ||
          (peer.x === 0 && peer.y === 0)
        ) {
          return null;
        }

        const vpt = canvas?.viewportTransform;
        const screenX = vpt ? peer.x * vpt[0] + vpt[4] : peer.x;
        const screenY = vpt ? peer.y * vpt[3] + vpt[5] : peer.y;

        if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) {
          return null;
        }

        return (
          <div
            key={peer.userId}
            className="pointer-events-none absolute z-30 transition-transform duration-75 ease-out"
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
              top: 0,
              left: 0,
            }}
          >
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              className="drop-shadow-md"
            >
              <path d="M0 0L16 12L8 12L4 20L0 0Z" fill={peer.color || "#5e6ad2"} />
            </svg>
            <span
              className="ml-3.5 -mt-2 inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold text-white shadow-md"
              style={{ backgroundColor: peer.color || "#5e6ad2" }}
            >
              {peer.name || "Collaborator"}
            </span>
          </div>
        );
      })}
    </>
  );
}
