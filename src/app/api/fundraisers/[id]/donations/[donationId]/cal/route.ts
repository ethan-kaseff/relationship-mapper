import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateDonationCalSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; donationId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateDonationCalSchema);
  if (!validation.success) return validation.response;

  try {
    const { id: fundraiserId, donationId } = await params;
    const data = validation.data;

    const existing = await prisma.donation.findFirst({ where: { id: donationId, fundraiserId } });
    if (!existing) return notFound("Donation not found");

    const updated = await prisma.donation.update({
      where: { id: donationId },
      data: {
        ...(data.calWrittenAt !== undefined
          ? { calWrittenAt: data.calWrittenAt ? new Date(data.calWrittenAt) : null }
          : {}),
        ...(data.calSentAt !== undefined
          ? { calSentAt: data.calSentAt ? new Date(data.calSentAt) : null }
          : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
