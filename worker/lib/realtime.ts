import { jwtVerify, SignJWT } from "jose";
import type { RealtimeTokenClaims } from "../../shared/types";
import type { Env } from "../types";

const encoder = new TextEncoder();

function getSecret(env: Env) {
  return encoder.encode(env.REALTIME_SECRET ?? env.BETTER_AUTH_SECRET);
}

export async function createRealtimeToken(
  env: Env,
  claims: RealtimeTokenClaims,
) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecret(env));
}

export async function verifyRealtimeToken(env: Env, token: string) {
  const result = await jwtVerify<RealtimeTokenClaims>(token, getSecret(env));
  return result.payload;
}
