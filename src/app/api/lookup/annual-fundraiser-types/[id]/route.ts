import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";
import { validateBody, updateAnnualFundraiserTypeSchema } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateAnnualFundraiserTypeSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const type = await prisma.annualFundraiserType.update({
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
    const existing = await prisma.annualFundraiserType.findUnique({ where: { id } });
    if (!existing) return notFound("Annual fundraiser type not found");
    await prisma.annualFundraiserType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
