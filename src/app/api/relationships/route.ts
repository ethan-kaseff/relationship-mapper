import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createRelationshipSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const relationships = await prisma.relationship.findMany({
      include: {
        person: true,
        partnerRole: {
          include: {
            partner: true,
          },
        },
        relationshipType: true,
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
    const relationship = await prisma.relationship.create({
      data: {
        peopleId: data.peopleId,
        partnerRoleId: data.partnerRoleId,
        relationshipTypeId: data.relationshipTypeId,
        lastReviewedDate: data.lastReviewedDate
          ? new Date(data.lastReviewedDate)
          : null,
      },
    });
    return NextResponse.json(relationship, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
