import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateDonationSeatPlanSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; donationId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateDonationSeatPlanSchema);
  if (!validation.success) return validation.response;

  try {
    const { id: fundraiserId, donationId } = await params;
    const data = validation.data;

    const existing = await prisma.donation.findFirst({ where: { id: donationId, fundraiserId } });
    if (!existing) return notFound("Donation not found");

    if (data.seatsReleased != null) {
      const sponsored = existing.sponsoredSeats ?? 0;
      const used = existing.seatsUsed ?? 0;
      if (data.seatsReleased + used > sponsored) {
        return NextResponse.json(
          { error: `Using (${used}) plus released (${data.seatsReleased}) can't exceed their ${sponsored} sponsored seats` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.donation.update({
      where: { id: donationId },
      data: {
        ...(data.assumedSeats !== undefined ? { assumedSeats: data.assumedSeats } : {}),
        ...(data.seatsReleased !== undefined ? { seatsReleased: data.seatsReleased } : {}),
        ...(data.attendancePlan !== undefined ? { attendancePlan: data.attendancePlan } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
