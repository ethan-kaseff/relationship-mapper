import { auth } from "@/lib/auth";
import { unauthorized, forbidden } from "@/lib/api-error";
import { ROLES, Role, hasMinimumRole, isAdmin, isSystemAdmin } from "@/types/roles";
import { Session } from "next-auth";

export type AuthResult = {
  success: true;
  session: Session & { user: { id: string; role: string; email: string; name: string } };
} | {
  success: false;
  response: Response;
};

/**
 * Require authentication for an API route.
 * Returns the session if authenticated, or an error response if not.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, response: unauthorized() };
  }

  return {
    success: true,
    session: session as Session & { user: { id: string; role: string; email: string; name: string } }
  };
}

/**
 * Require a minimum role level for an API route.
 * Uses role hierarchy: SYSTEM_ADMIN > OFFICE_ADMIN > OFFICE_USER > CONNECTOR
 */
export async function requireMinimumRole(requiredRole: Role): Promise<AuthResult> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  const userRole = authResult.session.user.role;
  if (!hasMinimumRole(userRole, requiredRole)) {
    return { success: false, response: forbidden() };
  }

  return authResult;
}

/**
 * Require user to NOT be a CONNECTOR role.
 * CONNECTORs have limited access to only their own data.
 */
export async function requireNonConnector(): Promise<AuthResult> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  if (authResult.session.user.role === ROLES.CONNECTOR) {
    return { success: false, response: forbidden() };
  }

  return authResult;
}

/**
 * Require OFFICE_ADMIN or SYSTEM_ADMIN role.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  if (!isAdmin(authResult.session.user.role)) {
    return { success: false, response: forbidden() };
  }

  return authResult;
}

/**
 * Require SYSTEM_ADMIN role.
 */
export async function requireSystemAdmin(): Promise<AuthResult> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  if (!isSystemAdmin(authResult.session.user.role)) {
    return { success: false, response: forbidden() };
  }

  return authResult;
}

// Re-export for convenience
export { ROLES, type Role };
