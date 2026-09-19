// The DevAtlas role ladder, lowest to highest. "owner" is never creatable through the app —
// it's granted by setting DEVATLAS_ADMIN_USER_ID, not through app_metadata.
export const ROLES = [
  "viewer",
  "developer",
  "lead_developer",
  "admin",
  "super_admin",
  "owner",
] as const;

export type AppRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  viewer: "Viewer",
  developer: "Developer",
  lead_developer: "Lead Developer",
  admin: "Admin",
  super_admin: "Super Admin",
  owner: "Owner",
};

export function isValidRole(value: unknown): value is AppRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function roleRank(role: AppRole): number {
  return ROLES.indexOf(role);
}

export function isAtLeast(role: AppRole, minimum: AppRole): boolean {
  return roleRank(role) >= roleRank(minimum);
}

// Only the configured owner can create accounts, regardless of team rank.
export function creatableRolesFor(callerRole: AppRole): AppRole[] {
  return callerRole === "owner" ? ROLES.filter(role => role !== "owner") : [];
}
