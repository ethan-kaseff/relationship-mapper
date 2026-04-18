import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
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
