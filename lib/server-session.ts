import { cookies } from "next/headers";
import type { AppSession } from "@/shared/types";

function getWorkerBaseUrl() {
  const value = process.env.BOARDLY_WORKER_URL;

  if (!value) {
    throw new Error("BOARDLY_WORKER_URL is not configured.");
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export async function getServerSession(): Promise<AppSession> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const response = await fetch(`${getWorkerBaseUrl()}/api/session`, {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      user: null,
      session: null,
    };
  }

  return (await response.json()) as AppSession;
}
