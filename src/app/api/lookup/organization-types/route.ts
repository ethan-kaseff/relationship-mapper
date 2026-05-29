import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { reservedColorError } from "@/lib/org-type-color";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const { officeId } = authResult.session.user as { officeId: string };
    const orgTypes = await prisma.organizationType.findMany({
      orderBy: { typeName: "asc" },
      include: {
        officeColors: {
          where: { officeId },
          select: { color: true },
          take: 1,
        },
      },
    });

    return NextResponse.json(
      orgTypes.map((ot) => ({
        id: ot.id,
        typeName: ot.typeName,
        color: ot.officeColors[0]?.color ?? null,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  typeName: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createSchema);
  if (!validation.success) return validation.response;

  const { typeName, color } = validation.data;

  if (color) {
    const err = reservedColorError(color);
    if (err) return NextResponse.json({ error: err }, { status: 422 });
  }

  try {
    const { officeId } = authResult.session.user as { officeId: string };
    const orgType = await prisma.organizationType.create({ data: { typeName } });

    if (color) {
      await prisma.organizationTypeColor.create({
        data: { orgTypeId: orgType.id, officeId, color },
      });
    }

    return NextResponse.json({ ...orgType, color: color ?? null }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
