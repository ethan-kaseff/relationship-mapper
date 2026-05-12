import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { z } from "zod";
import { validateBody } from "@/lib/validations";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const method = await prisma.communicationMethod.update({
      where: { id },
      data: { name: validation.data.name },
    });
    return NextResponse.json(method);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const count = await prisma.people.count({ where: { communicationMethodId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: "in_use", count },
        { status: 409 }
      );
    }
    await prisma.communicationMethod.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
