import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateDonationSeatsSchema, editDonationSchema } from "@/lib/validations";
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
    const { seatsUsed, sponsoredSeats, seatsChangeNote } = validation.data;

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
        ...(seatsChangeNote !== undefined ? { seatsChangeNote } : {}),
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

// Edit a donation's core fields. Adjusts the fundraiser's running total when
// the amount changes, and when the sponsorship level changes it re-syncs the
// seat counts and reconciles the linked event's placeholder seats to match.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; donationId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, editDonationSchema);
  if (!validation.success) return validation.response;

  try {
    const { id: fundraiserId, donationId } = await params;
    const data = validation.data;

    const existing = await prisma.donation.findFirst({
      where: { id: donationId, fundraiserId },
      include: {
        partner: { select: { organizationName: true } },
        fundraiser: { select: { eventId: true } },
      },
    });
    if (!existing) return notFound("Donation not found");

    const updateData: Record<string, unknown> = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.donorName !== undefined) updateData.donorName = data.donorName || null;
    if (data.donorEmail !== undefined) updateData.donorEmail = data.donorEmail || null;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.donatedAt !== undefined && data.donatedAt) updateData.donatedAt = new Date(data.donatedAt);
    if (data.isTaxDeductible !== undefined) updateData.isTaxDeductible = data.isTaxDeductible;
    if (data.taxDeductibleAmount !== undefined) updateData.taxDeductibleAmount = data.taxDeductibleAmount;
    if (data.tributeType !== undefined) updateData.tributeType = data.tributeType || null;
    if (data.tributeName !== undefined) updateData.tributeName = data.tributeName || null;
    if (data.isAnonymous !== undefined) updateData.isAnonymous = data.isAnonymous;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    // Changing the sponsorship level resets the included (sponsored) seat count
    // and the assumed estimate when those were still tracking the level. The
    // "Using" count follows the new level too — UNLESS it was deliberately set
    // below the sponsored number, in which case we keep that choice (only
    // clamping it down if the new level has fewer seats). Any change to "Using"
    // is mirrored onto the linked event's placeholder seats.
    let reconcileSeatsUsed: number | null = null;
    const levelChanged =
      data.sponsorshipLevelId !== undefined &&
      (data.sponsorshipLevelId || null) !== existing.sponsorshipLevelId;
    if (levelChanged) {
      updateData.sponsorshipLevelId = data.sponsorshipLevelId || null;
      if (data.sponsorshipLevelId) {
        const level = await prisma.sponsorshipLevel.findUnique({
          where: { id: data.sponsorshipLevelId },
          select: { seats: true },
        });
        if (level?.seats != null) {
          const newSponsored = level.seats;
          updateData.sponsoredSeats = newSponsored;
          if (existing.assumedSeats == null || existing.assumedSeats === existing.sponsoredSeats) {
            updateData.assumedSeats = newSponsored;
          }
          // Preserve a manually reduced "Using" count; otherwise follow the level.
          const oldUsing = existing.seatsUsed;
          let newUsing: number;
          if (oldUsing != null && oldUsing !== existing.sponsoredSeats) {
            newUsing = Math.min(oldUsing, newSponsored);
          } else {
            newUsing = newSponsored;
          }
          if (newUsing !== oldUsing) {
            updateData.seatsUsed = newUsing;
            reconcileSeatsUsed = newUsing;
          }
        }
      }
    }

    const amountDelta = data.amount !== undefined ? data.amount - existing.amount : 0;

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.donation.update({ where: { id: donationId }, data: updateData });
      if (amountDelta !== 0) {
        await tx.fundraiser.update({
          where: { id: fundraiserId },
          data: { currentAmount: { increment: amountDelta } },
        });
      }
      return d;
    });

    // A level change altered the seat count, so reconcile the linked event's
    // placeholder invites to match — the same logic the seats ("Using") editor
    // runs when that number is changed directly.
    const eventId = existing.fundraiser.eventId;
    if (eventId && reconcileSeatsUsed !== null) {
      const group = existing.partner?.organizationName ?? existing.donorName ?? null;
      if (group) {
        const invites = await prisma.eventInvite.findMany({
          where: { eventId, group },
          select: { id: true, isPlaceholder: true, tableId: true },
        });

        const namedCount = invites.filter((i) => !i.isPlaceholder).length;
        const placeholders = invites.filter((i) => i.isPlaceholder);
        const desiredPlaceholders = Math.max(0, reconcileSeatsUsed - namedCount);
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

    return NextResponse.json(updated);
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
