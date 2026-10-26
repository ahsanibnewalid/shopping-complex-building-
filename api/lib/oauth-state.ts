import { randomBytes, timingSafeEqual } from "node:crypto";

/** Create an unpredictable OAuth CSRF nonce suitable for a short-lived cookie. */
export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

/** Compare callback state without leaking the first mismatching byte. */
export function matchesOAuthState(expected: string, actual: string): boolean {
  if (!expected || !actual || expected.length > 256 || actual.length > 256) return false;
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length &&
    expectedBytes.length > 0 &&
    timingSafeEqual(expectedBytes, actualBytes);
}
