import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { z } from "zod";
import { validateBody } from "@/lib/validations";

const updateRelationshipTypeSchema = z.object({
  relationshipDesc: z.string().min(1).max(255).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const reassignTo = url.searchParams.get("reassignTo");

    const count = await prisma.relationship.count({
      where: { relationshipTypeId: id },
    });

    if (count > 0 && !reassignTo) {
      return NextResponse.json(
        { error: "in_use", count },
        { status: 409 }
      );
    }

    if (count > 0 && reassignTo) {
      await prisma.relationship.updateMany({
        where: { relationshipTypeId: id },
        data: { relationshipTypeId: reassignTo },
      });
    }

    await prisma.relationshipType.delete({ where: { id } });
    return NextResponse.json({ message: "Relationship type deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateRelationshipTypeSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const data = validation.data;
    const relType = await prisma.relationshipType.update({
      where: { id },
      data: {
        relationshipDesc: data.relationshipDesc,
        notes: data.notes,
      },
    });
    return NextResponse.json(relType);
  } catch (error) {
    return handleApiError(error);
  }
}
