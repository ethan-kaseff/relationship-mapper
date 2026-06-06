import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateDonationSeatsSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; donationId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { donationId } = await params;
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        person: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!donation) return notFound("Donation not found");
    return NextResponse.json(donation);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; donationId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateDonationSeatsSchema);
  if (!validation.success) return validation.response;

  try {
    const { id: fundraiserId, donationId } = await params;
    const { seatsUsed, sponsoredSeats } = validation.data;

    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        partner: { select: { organizationName: true } },
        fundraiser: { select: { eventId: true } },
      },
    });
    if (!donation) return notFound("Donation not found");

    // Update the donation
    const updated = await prisma.donation.update({
      where: { id: donationId },
      data: {
        seatsUsed,
        ...(sponsoredSeats !== undefined ? { sponsoredSeats } : {}),
      },
    });

    // Reconcile event invite list if seats are relevant
    const effectiveSponsoredSeats = sponsoredSeats ?? donation.sponsoredSeats;
    const eventId = donation.fundraiser.eventId;

    if (eventId && seatsUsed !== null && effectiveSponsoredSeats !== 0) {
      const group = donation.partner?.organizationName ?? donation.donorName ?? null;

      if (group) {
        const invites = await prisma.eventInvite.findMany({
          where: { eventId, group },
          select: { id: true, isPlaceholder: true, tableId: true },
        });

        const namedCount = invites.filter((i) => !i.isPlaceholder).length;
        const placeholders = invites.filter((i) => i.isPlaceholder);
        const desiredPlaceholders = Math.max(0, seatsUsed - namedCount);
        const diff = desiredPlaceholders - placeholders.length;

        if (diff > 0) {
          await prisma.eventInvite.createMany({
            data: Array.from({ length: diff }, () => ({
              eventId,
              peopleId: null,
              isPlaceholder: true,
              group,
              ticketType: "Regular",
            })),
          });
        } else if (diff < 0) {
          // Remove unassigned placeholders first, then assigned ones
          const toRemove = [...placeholders]
            .sort((a, b) => (a.tableId ? 1 : 0) - (b.tableId ? 1 : 0))
            .slice(0, Math.abs(diff))
            .map((p) => p.id);
          await prisma.eventInvite.deleteMany({ where: { id: { in: toRemove } } });
        }
      }
    }

    return NextResponse.json({ ...updated, fundraiserId });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; donationId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id, donationId } = await params;
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
    });
    if (!donation) return notFound("Donation not found");

    // Transaction: delete donation and decrement currentAmount
    await prisma.$transaction(async (tx) => {
      await tx.donation.delete({ where: { id: donationId } });
      await tx.fundraiser.update({
        where: { id },
        data: { currentAmount: { decrement: donation.amount } },
      });
    });

    return NextResponse.json({ message: "Donation deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
