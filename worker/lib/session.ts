import { createAuth } from "../auth";
import type { Env } from "../types";

export async function getSession(request: Request, env: Env) {
  const auth = createAuth(env);
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function requireSession(request: Request, env: Env) {
  const session = await getSession(request, env);

  if (!session) {
    return null;
  }

  return session;
}
