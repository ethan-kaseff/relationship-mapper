import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/partner-roles/[id] — update a partner role (e.g. remove/reassign person)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    console.error("Failed to update partner role:", error);
    return NextResponse.json(
      { error: "Failed to update partner role" },
      { status: 500 }
    );
  }
}
