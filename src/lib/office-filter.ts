import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Returns a Prisma `where` clause fragment for office filtering.
 * - System Admins always see all data (returns {}).
 * - Other roles see only their office unless the viewAllOffices cookie is "true".
 */
export async function getOfficeFilter(): Promise<{ officeId?: string }> {
  const session = await auth();
  if (!session?.user) return {};

  // System Admins always see everything
  if (session.user.role === "SYSTEM_ADMIN") return {};

  const cookieStore = await cookies();
  const viewAll = cookieStore.get("viewAllOffices")?.value === "true";
  if (viewAll) return {};

  return { officeId: session.user.officeId };
}

/**
 * Same logic but for API routes that receive a Request object.
 * Reads the cookie from the request headers.
 */
export async function getOfficeFilterFromRequest(request: Request): Promise<{ officeId?: string }> {
  const session = await auth();
  if (!session?.user) return {};

  if (session.user.role === "SYSTEM_ADMIN") return {};

  const cookieHeader = request.headers.get("cookie") || "";
  const viewAll = cookieHeader.split(";").some(
    (c) => c.trim() === "viewAllOffices=true"
  );
  if (viewAll) return {};

  return { officeId: session.user.officeId };
}
