import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateInviteSchema } from "@/lib/validations";
import { handleApiError, notFound, conflict } from "@/lib/api-error";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateInviteSchema);
  if (!validation.success) return validation.response;

  try {
    const { inviteId } = await params;
    const data = validation.data;

    const invite = await prisma.eventInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) return notFound("Invite not found");

    // A TBD placeholder must keep its group (it's a sponsor's reserved seat) —
    // never let an update blank it out, which would orphan the seat.
    if (invite.isPlaceholder && data.group !== undefined && !data.group.trim()) {
      delete data.group;
    }

    // When filling a placeholder with an existing person, check for duplicate
    if (data.peopleId) {
      const existing = await prisma.eventInvite.findFirst({
        where: { eventId: invite.eventId, peopleId: data.peopleId, id: { not: inviteId } },
      });
      if (existing) return conflict("This person is already invited to this event");
    }

    // If RSVP status is changing away from YES, clear seating assignment
    const clearSeating =
      data.rsvpStatus &&
      data.rsvpStatus !== "YES" &&
      invite.rsvpStatus === "YES";

    // When assigning a person or guest to a placeholder, clear placeholder flag
    const fillingPlaceholder = invite.isPlaceholder && (data.peopleId || data.guestName);

    const updated = await prisma.eventInvite.update({
      where: { id: inviteId },
      data: {
        ...data,
        ...(data.rsvpStatus === "YES" || data.rsvpStatus === "NO" || data.rsvpStatus === "MAYBE"
          ? { rsvpDate: new Date() }
          : {}),
        ...(clearSeating ? { tableId: null, seatIndex: null } : {}),
        ...(fillingPlaceholder ? { isPlaceholder: false } : {}),
        ...(data.peopleId ? { isGuest: false, guestName: null, guestEmail: null } : {}),
        ...(data.guestName && !data.peopleId ? { isGuest: true, peopleId: null } : {}),
      },
      include: { person: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { inviteId } = await params;
    await prisma.eventInvite.delete({ where: { id: inviteId } });
    return NextResponse.json({ message: "Invite removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
