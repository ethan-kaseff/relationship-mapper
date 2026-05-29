import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { reservedColorError } from "@/lib/org-type-color";

const updateSchema = z.object({
  typeName: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateSchema);
  if (!validation.success) return validation.response;

  const { typeName, color } = validation.data;

  if (color) {
    const err = reservedColorError(color);
    if (err) return NextResponse.json({ error: err }, { status: 422 });
  }

  try {
    const { id } = await params;
    const { officeId } = authResult.session.user as { officeId: string };

    if (typeName !== undefined) {
      await prisma.organizationType.update({ where: { id }, data: { typeName } });
    }

    if (color !== undefined) {
      if (color === null) {
        await prisma.organizationTypeColor.deleteMany({ where: { orgTypeId: id, officeId } });
      } else {
        await prisma.organizationTypeColor.upsert({
          where: { orgTypeId_officeId: { orgTypeId: id, officeId } },
          create: { orgTypeId: id, officeId, color },
          update: { color },
        });
      }
    }

    return NextResponse.json({ id, typeName, color });
  } catch (error) {
    return handleApiError(error);
  }
}
