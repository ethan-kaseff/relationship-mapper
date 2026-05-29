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
    const { peopleIds = [], guests = [], placeholderCount, notes, rsvpStatus = "PENDING", meal = "Standard", dietary = [], ticketType = "Regular", seatingRequest, tableRequest, group } = validation.data;
    const rsvpDate = rsvpStatus !== "PENDING" ? new Date() : null;
    const sharedFields = { rsvpStatus, meal, dietary, ticketType, ...(seatingRequest ? { seatingRequest } : {}), ...(tableRequest ? { tableRequest } : {}), ...(rsvpDate ? { rsvpDate } : {}), ...(group ? { group } : {}) };

    let created = 0;
    let skipped = 0;

    // Handle regular people invites
    if (peopleIds.length > 0) {
      const existing = await prisma.eventInvite.findMany({
        where: { eventId, peopleId: { in: peopleIds } },
        select: { peopleId: true },
      });
      const existingIds = new Set(existing.map((e) => e.peopleId));
      const newIds = peopleIds.filter((pid: string) => !existingIds.has(pid));
      skipped += existingIds.size;

      if (newIds.length > 0) {
        const result = await prisma.eventInvite.createMany({
          data: newIds.map((peopleId: string) => ({ eventId, peopleId, ...sharedFields })),
        });
        created += result.count;
      }
    }

    // Handle guest invites
    if (guests.length > 0) {
      const result = await prisma.eventInvite.createMany({
        data: guests.map((g: { name: string; email?: string }) => ({
          eventId,
          peopleId: null,
          isGuest: true,
          guestName: g.name,
          guestEmail: g.email || null,
          notes: notes || null,
          ...sharedFields,
        })),
      });
      created += result.count;
    }

    // Handle placeholder invites
    if (placeholderCount && placeholderCount > 0) {
      const result = await prisma.eventInvite.createMany({
        data: Array.from({ length: placeholderCount }, () => ({
          eventId,
          peopleId: null,
          isPlaceholder: true,
          notes: notes || null,
          ticketType,
          ...(group ? { group } : {}),
        })),
      });
      created += result.count;
    }

    if (created === 0 && skipped > 0) {
      return conflict("All selected people are already invited");
    }

    return NextResponse.json(
      { created, skipped },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
