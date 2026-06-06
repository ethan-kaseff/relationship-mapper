import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createRelationshipSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilterFromRequest } from "@/lib/office-filter";

export async function GET(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const officeFilter = await getOfficeFilterFromRequest(request);
    const personFilter = officeFilter.officeId
      ? { person: { officeId: officeFilter.officeId } }
      : {};
    const relationships = await prisma.relationship.findMany({
      where: personFilter,
      include: {
        person: true,
        targetPerson: true,
        partnerRole: {
          include: {
            partner: true,
          },
        },
        relationshipTypes: {
          include: { relationshipType: true },
        },
      },
    });
    return NextResponse.json(relationships);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createRelationshipSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;

    let targetPersonId = data.targetPersonId;
    if (!targetPersonId && data.partnerRoleId) {
      const role = await prisma.partnerRole.findUnique({
        where: { id: data.partnerRoleId },
      });
      targetPersonId = role?.peopleId || undefined;
    }

    if (!targetPersonId) {
      return NextResponse.json(
        { error: "Could not determine target person" },
        { status: 400 }
      );
    }

    const relationship = await prisma.relationship.create({
      data: {
        peopleId: data.peopleId,
        targetPersonId,
        partnerRoleId: data.partnerRoleId || null,
        lastReviewedDate: data.lastReviewedDate ? new Date(data.lastReviewedDate) : null,
        relationshipTypes: {
          create: data.relationshipTypeIds.map((id) => ({ relationshipTypeId: id })),
        },
      },
      include: {
        relationshipTypes: { include: { relationshipType: true } },
      },
    });
    return NextResponse.json(relationship, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
