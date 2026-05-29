import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateSponsorshipLevelSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; levelId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateSponsorshipLevelSchema);
  if (!validation.success) return validation.response;

  try {
    const { levelId } = await params;
    const level = await prisma.sponsorshipLevel.findUnique({ where: { id: levelId } });
    if (!level) return notFound("Sponsorship level not found");

    const updated = await prisma.sponsorshipLevel.update({
      where: { id: levelId },
      data: validation.data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; levelId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { levelId } = await params;
    await prisma.sponsorshipLevel.delete({ where: { id: levelId } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
