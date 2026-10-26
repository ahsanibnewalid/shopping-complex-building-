import { describe, expect, it } from "vitest";
import { hasRequiredTenantRole } from "./tenant-permissions";

describe("tenant role authorization policy", () => {
  it("allows staff only staff-level operations", () => {
    expect(hasRequiredTenantRole("staff", "staff")).toBe(true);
    expect(hasRequiredTenantRole("staff", "manager")).toBe(false);
    expect(hasRequiredTenantRole("staff", "owner")).toBe(false);
  });

  it("allows managers to manage a shop but not owner-only controls", () => {
    expect(hasRequiredTenantRole("manager", "staff")).toBe(true);
    expect(hasRequiredTenantRole("manager", "manager")).toBe(true);
    expect(hasRequiredTenantRole("manager", "owner")).toBe(false);
  });

  it("allows owners all tenant roles", () => {
    expect(hasRequiredTenantRole("owner", "staff")).toBe(true);
    expect(hasRequiredTenantRole("owner", "manager")).toBe(true);
    expect(hasRequiredTenantRole("owner", "owner")).toBe(true);
  });
});
