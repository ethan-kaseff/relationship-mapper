import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, bulkCreateInvitesSchema } from "@/lib/validations";
import { handleApiError, conflict } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const invites = await prisma.eventInvite.findMany({
      where: { eventId: id },
      include: { person: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(invites);
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

  const validation = await validateBody(request, bulkCreateInvitesSchema);
  if (!validation.success) return validation.response;

  try {
    const { id: eventId } = await params;
    const { peopleIds } = validation.data;

    // Check for existing invites to avoid duplicates
    const existing = await prisma.eventInvite.findMany({
      where: { eventId, peopleId: { in: peopleIds } },
      select: { peopleId: true },
    });
    const existingIds = new Set(existing.map((e) => e.peopleId));
    const newIds = peopleIds.filter((pid: string) => !existingIds.has(pid));

    if (newIds.length === 0) {
      return conflict("All selected people are already invited");
    }

    const invites = await prisma.eventInvite.createMany({
      data: newIds.map((peopleId: string) => ({
        eventId,
        peopleId,
      })),
    });

    return NextResponse.json(
      { created: invites.count, skipped: existingIds.size },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
