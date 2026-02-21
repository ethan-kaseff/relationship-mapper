import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type OfficeFilter = { officeId?: string | { notIn: string[] } };

/**
 * Returns a Prisma `where` clause fragment for office filtering.
 * - System Admins always see all data (returns {}).
 * - Siloed office users always see only their own office data.
 * - Non-siloed users viewing "My Office" see only their office data.
 * - Non-siloed users viewing "All Offices" see all non-siloed office data.
 */
export async function getOfficeFilter(): Promise<OfficeFilter> {
  const session = await auth();
  if (!session?.user) return {};

  // System Admins always see everything
  if (session.user.role === "SYSTEM_ADMIN") return {};

  const officeId = session.user.officeId;

  // Check if user's office is siloed
  const office = await prisma.office.findUnique({
    where: { id: officeId },
    select: { isSiloed: true },
  });

  // Siloed office users always see only their own data
  if (office?.isSiloed) return { officeId };

  const cookieStore = await cookies();
  const viewAll = cookieStore.get("viewAllOffices")?.value === "true";

  if (!viewAll) return { officeId };

  // Non-siloed user viewing all offices — exclude siloed offices
  const siloedOffices = await prisma.office.findMany({
    where: { isSiloed: true },
    select: { id: true },
  });

  if (siloedOffices.length === 0) return {};

  return { officeId: { notIn: siloedOffices.map((o) => o.id) } };
}

/**
 * Same logic but for API routes that receive a Request object.
 * Reads the cookie from the request headers.
 */
export async function getOfficeFilterFromRequest(request: Request): Promise<OfficeFilter> {
  const session = await auth();
  if (!session?.user) return {};

  if (session.user.role === "SYSTEM_ADMIN") return {};

  const officeId = session.user.officeId;

  const office = await prisma.office.findUnique({
    where: { id: officeId },
    select: { isSiloed: true },
  });

  if (office?.isSiloed) return { officeId };

  const cookieHeader = request.headers.get("cookie") || "";
  const viewAll = cookieHeader.split(";").some(
    (c) => c.trim() === "viewAllOffices=true"
  );

  if (!viewAll) return { officeId };

  const siloedOffices = await prisma.office.findMany({
    where: { isSiloed: true },
    select: { id: true },
  });

  if (siloedOffices.length === 0) return {};

  return { officeId: { notIn: siloedOffices.map((o) => o.id) } };
}
