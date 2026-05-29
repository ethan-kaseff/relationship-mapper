import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id: eventId } = await params;

    const fundraiser = await prisma.fundraiser.findFirst({
      where: { eventId },
      select: { id: true },
    });

    if (!fundraiser) return NextResponse.json([]);

    const levels = await prisma.sponsorshipLevel.findMany({
      where: { fundraiserId: fundraiser.id },
      orderBy: [{ displayOrder: "asc" }, { amount: "desc" }],
    });
    return NextResponse.json(levels);
  } catch (error) {
    return handleApiError(error);
  }
}
