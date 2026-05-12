import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateRelationshipSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const relationship = await prisma.relationship.findUnique({
      where: { id },
      include: {
        person: true,
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
    if (!relationship) {
      return notFound("Relationship not found");
    }
    return NextResponse.json(relationship);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateRelationshipSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const data = validation.data;

    const updateData: Parameters<typeof prisma.relationship.update>[0]["data"] = {
      lastReviewedDate: data.lastReviewedDate ? new Date(data.lastReviewedDate) : undefined,
    };

    if (data.relationshipTypeIds) {
      updateData.relationshipTypes = {
        deleteMany: {},
        create: data.relationshipTypeIds.map((typeId) => ({ relationshipTypeId: typeId })),
      };
    }

    const relationship = await prisma.relationship.update({
      where: { id },
      data: updateData,
      include: {
        relationshipTypes: { include: { relationshipType: true } },
      },
    });
    return NextResponse.json(relationship);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    await prisma.relationship.delete({ where: { id } });
    return NextResponse.json({ message: "Relationship deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
