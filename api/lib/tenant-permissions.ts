import type { TenantRole } from "@contracts/marketplace";

const ROLE_RANK: Record<TenantRole, number> = {
  staff: 1,
  manager: 2,
  owner: 3,
};

/** A tenant membership may perform an operation only at or below its role. */
export function hasRequiredTenantRole(
  actualRole: TenantRole,
  minimumRole: TenantRole,
): boolean {
  return ROLE_RANK[actualRole] >= ROLE_RANK[minimumRole];
}
