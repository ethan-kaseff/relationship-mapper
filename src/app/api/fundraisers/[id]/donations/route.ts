import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createDonationSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const fundraiser = await prisma.fundraiser.findUnique({ where: { id } });
    if (!fundraiser) return notFound("Fundraiser not found");

    const donations = await prisma.donation.findMany({
      where: { fundraiserId: id },
      include: {
        person: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { donatedAt: "desc" },
    });

    return NextResponse.json(donations);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createDonationSchema);
  if (!validation.success) return validation.response;

  try {
    const { id: fundraiserId } = await params;
    const data = validation.data;

    // Use a transaction to create donation and update currentAmount atomically
    const donation = await prisma.$transaction(async (tx) => {
      const fundraiser = await tx.fundraiser.findUnique({
        where: { id: fundraiserId },
      });
      if (!fundraiser) throw new Error("FUNDRAISER_NOT_FOUND");

      const newDonation = await tx.donation.create({
        data: {
          fundraiserId,
          amount: data.amount,
          donorName: data.donorName,
          donorEmail: data.donorEmail,
          peopleId: data.peopleId ?? null,
          isAnonymous: data.isAnonymous ?? false,
          paymentMethod: data.paymentMethod ?? "other",
          tributeType: data.tributeType ?? null,
          tributeName: data.tributeName ?? null,
          isTaxDeductible: data.isTaxDeductible ?? true,
          taxDeductibleAmount: data.taxDeductibleAmount ?? null,
          notes: data.notes,
          approvalStatus: data.peopleId ? "AUTO_APPROVED" : "PENDING",
          donatedAt: data.donatedAt ? new Date(data.donatedAt) : new Date(),
        },
      });

      await tx.fundraiser.update({
        where: { id: fundraiserId },
        data: { currentAmount: { increment: data.amount } },
      });

      return newDonation;
    });

    return NextResponse.json(donation, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "FUNDRAISER_NOT_FOUND") {
      return notFound("Fundraiser not found");
    }
    return handleApiError(error);
  }
}
