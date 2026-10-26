import * as jose from "jose";
import { env } from "../lib/env";
import type { SessionPayload } from "./types";

const JWT_ALG = "HS256";
const SESSION_ISSUER = "bazarhub";
const SESSION_AUDIENCE = env.appId;

export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG, typ: "JWT" })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(env.appSecret);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    const { unionId, clientId } = payload;
    if (
      typeof unionId !== "string" || unionId.length === 0 ||
      typeof clientId !== "string" || clientId !== env.appId
    ) {
      return null;
    }
    return { unionId, clientId };
  } catch {
    return null;
  }
}
