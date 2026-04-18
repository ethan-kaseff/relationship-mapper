import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound, badRequest } from "@/lib/api-error";
import { syncDonationsByDay, isQBConnected } from "@/lib/quickbooks";

/**
 * Syncs all donations for the same day as this donation.
 * QB receipts are batched daily to match Stripe payouts.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; donationId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id, donationId } = await params;
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: { fundraiser: { select: { officeId: true } } },
    });
    if (!donation) return notFound("Donation not found");
    if (donation.fundraiserId !== id) return badRequest("Donation does not belong to this fundraiser");

    const connected = await isQBConnected(donation.fundraiser.officeId);
    if (!connected) {
      return NextResponse.json(
        { error: "QuickBooks is not connected" },
        { status: 400 }
      );
    }

    const result = await syncDonationsByDay(id, donation.fundraiser.officeId);

    return NextResponse.json({
      total: result.synced + result.errors,
      synced: result.synced,
      errors: result.errors,
      receiptsCreated: result.receiptCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
