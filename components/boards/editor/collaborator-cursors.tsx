"use client";

import type { PresenceUser } from "@/shared/types";

interface CollaboratorCursorsProps {
  peers: PresenceUser[];
}

export function CollaboratorCursors({ peers }: CollaboratorCursorsProps) {
  if (!peers || peers.length === 0) return null;

  return (
    <>
      {peers.map((peer) => (
        <div
          key={peer.userId}
          className="pointer-events-none absolute z-20 transition-all duration-75 ease-linear"
          style={{ left: peer.x, top: peer.y }}
        >
          <svg
            width="16"
            height="20"
            viewBox="0 0 16 20"
            fill="none"
            className="drop-shadow-md"
          >
            <path d="M0 0L16 12L8 12L4 20L0 0Z" fill={peer.color} />
          </svg>
          <span className="ml-3 mt-1 inline-block whitespace-nowrap rounded-md bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white shadow-md">
            {peer.name}
          </span>
        </div>
      ))}
    </>
  );
}
