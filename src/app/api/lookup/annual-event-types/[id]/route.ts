import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";
import { validateBody, updateAnnualEventTypeSchema } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateAnnualEventTypeSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const type = await prisma.annualEventType.update({
      where: { id },
      data: { name: validation.data.name },
    });
    return NextResponse.json(type);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;

    const existing = await prisma.annualEventType.findUnique({ where: { id } });
    if (!existing) return notFound("Annual event type not found");

    // Cascade deletes join rows automatically via schema
    await prisma.annualEventType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
