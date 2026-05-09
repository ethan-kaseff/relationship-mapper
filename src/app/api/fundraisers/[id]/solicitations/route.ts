import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, conflict } from "@/lib/api-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id: fundraiserId } = await params;
    const solicitations = await prisma.fundraiserSolicitation.findMany({
      where: { fundraiserId },
      include: { person: { select: { id: true, firstName: true, lastName: true, email1: true, email2: true } } },
      orderBy: [{ person: { lastName: "asc" } }, { person: { firstName: "asc" } }],
    });
    return NextResponse.json(solicitations);
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

  try {
    const { id: fundraiserId } = await params;
    const { peopleIds } = await request.json() as { peopleIds: string[] };

    const existing = await prisma.fundraiserSolicitation.findMany({
      where: { fundraiserId, peopleId: { in: peopleIds } },
      select: { peopleId: true },
    });
    const existingIds = new Set(existing.map((s) => s.peopleId));
    const newIds = peopleIds.filter((pid) => !existingIds.has(pid));

    if (newIds.length === 0) return conflict("All selected people are already on the list");

    const result = await prisma.fundraiserSolicitation.createMany({
      data: newIds.map((peopleId) => ({ fundraiserId, peopleId })),
    });

    return NextResponse.json({ created: result.count, skipped: existingIds.size }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
