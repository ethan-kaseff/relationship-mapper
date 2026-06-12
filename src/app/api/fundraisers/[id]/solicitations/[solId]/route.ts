import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";
import { validateBody, updatePledgeSchema } from "@/lib/validations";

const DATE_FIELDS = ["pledgeDate", "palWrittenAt", "palSentAt", "calWrittenAt", "calSentAt"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; solId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id: fundraiserId, solId } = await params;

    const validation = await validateBody(request, updatePledgeSchema);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const existing = await prisma.fundraiserSolicitation.findFirst({ where: { id: solId, fundraiserId } });
    if (!existing) return notFound("Solicitation not found");

    const updateData: Record<string, unknown> = { ...data };
    for (const field of DATE_FIELDS) {
      if (field in updateData) {
        const value = updateData[field] as string | null;
        updateData[field] = value ? new Date(value) : null;
      }
    }

    const updated = await prisma.fundraiserSolicitation.update({
      where: { id: solId },
      data: updateData,
      include: {
        person: { select: { id: true, firstName: true, lastName: true, email1: true, email2: true, listedAs: true } },
        partner: { select: { id: true, organizationName: true, email: true, listedAs: true } },
        solicitor: { select: { id: true, firstName: true, lastName: true } },
        solicitationNotes: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; solId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id: fundraiserId, solId } = await params;
    const existing = await prisma.fundraiserSolicitation.findFirst({ where: { id: solId, fundraiserId } });
    if (!existing) return notFound("Solicitation not found");

    await prisma.fundraiserSolicitation.delete({ where: { id: solId } });
    return NextResponse.json({ message: "Removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
