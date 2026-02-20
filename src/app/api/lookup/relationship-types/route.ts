import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { z } from "zod";
import { validateBody } from "@/lib/validations";

const createRelationshipTypeSchema = z.object({
  relationshipDesc: z.string().min(1, "Description is required").max(255),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const relationshipTypes = await prisma.relationshipType.findMany({
      include: { _count: { select: { relationships: true } } },
    });
    return NextResponse.json(relationshipTypes);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createRelationshipTypeSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;
    const relType = await prisma.relationshipType.create({
      data: {
        relationshipDesc: data.relationshipDesc,
        notes: data.notes || null,
      },
    });
    return NextResponse.json(relType, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
