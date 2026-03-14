import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, inviteFromPartnerSchema } from "@/lib/validations";
import { handleApiError, badRequest } from "@/lib/api-error";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, inviteFromPartnerSchema);
  if (!validation.success) return validation.response;

  try {
    const { id: eventId } = await params;
    const { partnerId, roleIds } = validation.data;

    // Get partner name for group field
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { organizationName: true },
    });
    const group = partner?.organizationName || "";

    // Get partner roles, optionally filtered
    const where: Record<string, unknown> = { partnerId, peopleId: { not: null } };
    if (roleIds && roleIds.length > 0) {
      where.id = { in: roleIds };
    }

    const roles = await prisma.partnerRole.findMany({
      where,
      select: { peopleId: true },
    });

    const peopleIds = [...new Set(
      roles
        .map((r) => r.peopleId)
        .filter((id): id is string => id !== null)
    )];

    if (peopleIds.length === 0) {
      return badRequest("No people found for the selected partner/roles");
    }

    // Check for existing invites
    const existing = await prisma.eventInvite.findMany({
      where: { eventId, peopleId: { in: peopleIds } },
      select: { peopleId: true },
    });
    const existingIds = new Set(existing.map((e) => e.peopleId));
    const newIds = peopleIds.filter((pid) => !existingIds.has(pid));

    if (newIds.length === 0) {
      return NextResponse.json({ created: 0, skipped: existingIds.size });
    }

    const invites = await prisma.eventInvite.createMany({
      data: newIds.map((peopleId) => ({
        eventId,
        peopleId,
        group,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json(
      { created: invites.count, skipped: existingIds.size },
      { status: 201 }
    );
  } catch (error) {
    console.error("from-partner error:", error);
    return handleApiError(error);
  }
}
