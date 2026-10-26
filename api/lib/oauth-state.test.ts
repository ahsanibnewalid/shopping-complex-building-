import { describe, expect, it } from "vitest";
import { createOAuthState, matchesOAuthState } from "./oauth-state";

describe("OAuth state", () => {
  it("generates a high-entropy URL-safe state value", () => {
    const state = createOAuthState();
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createOAuthState()).not.toBe(state);
  });

  it("accepts only the exact non-empty state", () => {
    const state = createOAuthState();
    expect(matchesOAuthState(state, state)).toBe(true);
    expect(matchesOAuthState(state, "different-state")).toBe(false);
    expect(matchesOAuthState("", state)).toBe(false);
    expect(matchesOAuthState(state, "")).toBe(false);
    expect(matchesOAuthState(state, "x".repeat(257))).toBe(false);
  });
});
