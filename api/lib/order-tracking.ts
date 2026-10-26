import { createHash, randomBytes } from "node:crypto";

export interface OrderTrackingCredentials {
  /** One-time secret returned to the customer after successful checkout. */
  token: string;
  /** Only the SHA-256 digest is stored in the orders table. */
  tokenHash: string;
}

export function hashOrderTrackingToken(token: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new Error("Invalid order tracking token");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createOrderTrackingCredentials(): OrderTrackingCredentials {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashOrderTrackingToken(token) };
}
