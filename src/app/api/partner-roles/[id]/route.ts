import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";

// PATCH /api/partner-roles/[id] — update a partner role (e.g. remove/reassign person)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const body = await request.json();

    const personChanging = body.peopleId !== undefined;

    if (personChanging) {
      const current = await prisma.partnerRole.findUnique({ where: { id } });
      const oldPersonId = current?.peopleId;
      const newPersonId = body.peopleId === null ? null : body.peopleId;

      if (oldPersonId && oldPersonId !== newPersonId) {
        // Person is being removed or replaced — detach relationships from this
        // role (they persist as person-to-person) and delete connections
        await prisma.relationship.updateMany({
          where: { partnerRoleId: id },
          data: { partnerRoleId: null },
        });
        await prisma.connection.deleteMany({ where: { partnerRoleId: id } });

        // Close the active RoleAssignment for the outgoing person
        const activeAssignment = await prisma.roleAssignment.findFirst({
          where: { partnerRoleId: id, peopleId: oldPersonId, endDate: null },
          orderBy: { createdAt: "desc" },
        });
        if (activeAssignment) {
          await prisma.roleAssignment.update({
            where: { id: activeAssignment.id },
            data: { endDate: body.endDate ? new Date(body.endDate) : new Date() },
          });
        }
      }

      // Create a new RoleAssignment for the incoming person
      if (newPersonId && newPersonId !== oldPersonId) {
        await prisma.roleAssignment.create({
          data: {
            partnerRoleId: id,
            peopleId: newPersonId,
            startDate: body.startDate ? new Date(body.startDate) : null,
          },
        });
      }
    }

    const role = await prisma.partnerRole.update({
      where: { id },
      data: {
        ...(body.peopleId !== undefined
          ? { peopleId: body.peopleId === null ? null : body.peopleId }
          : {}),
        ...(body.roleDescription !== undefined
          ? { roleDescription: body.roleDescription }
          : {}),
      },
    });

    return NextResponse.json(role);
  } catch (error) {
    return handleApiError(error);
  }
}
