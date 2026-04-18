import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";
import { syncDonationsByDay, isQBConnected } from "@/lib/quickbooks";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const fundraiser = await prisma.fundraiser.findUnique({
      where: { id },
      select: { officeId: true },
    });
    if (!fundraiser) return notFound("Fundraiser not found");

    const connected = await isQBConnected(fundraiser.officeId);
    if (!connected) {
      return NextResponse.json(
        { error: "QuickBooks is not connected" },
        { status: 400 }
      );
    }

    const result = await syncDonationsByDay(id, fundraiser.officeId);

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
