export const ROLES = {
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  OFFICE_ADMIN: "OFFICE_ADMIN",
  OFFICE_USER: "OFFICE_USER",
  CONNECTOR: "CONNECTOR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  SYSTEM_ADMIN: 4,
  OFFICE_ADMIN: 3,
  OFFICE_USER: 2,
  CONNECTOR: 1,
};

export function hasMinimumRole(userRole: string | undefined, requiredRole: Role): boolean {
  if (!userRole) return false;
  const userLevel = ROLE_HIERARCHY[userRole as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  return userLevel >= requiredLevel;
}

export function isAdmin(role: string | undefined): boolean {
  return role === ROLES.SYSTEM_ADMIN || role === ROLES.OFFICE_ADMIN;
}

export function isSystemAdmin(role: string | undefined): boolean {
  return role === ROLES.SYSTEM_ADMIN;
}
