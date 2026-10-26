import { describe, expect, it } from "vitest";
import {
  createOrderTrackingCredentials,
  hashOrderTrackingToken,
} from "./order-tracking";

describe("order tracking credentials", () => {
  it("generates an unguessable, URL-safe token and a fixed-length digest", () => {
    const credentials = createOrderTrackingCredentials();
    expect(credentials.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(credentials.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(credentials.tokenHash).not.toContain(credentials.token);
  });

  it("hashes the same token consistently", () => {
    const credentials = createOrderTrackingCredentials();
    expect(hashOrderTrackingToken(credentials.token)).toBe(credentials.tokenHash);
  });

  it("creates distinct credentials for separate orders", () => {
    expect(createOrderTrackingCredentials().token).not.toBe(
      createOrderTrackingCredentials().token,
    );
  });

  it("rejects malformed tokens", () => {
    expect(() => hashOrderTrackingToken("12345")).toThrow("Invalid order tracking token");
  });
});
