import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateInviteSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

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

    // If RSVP status is changing away from YES, clear seating assignment
    const clearSeating =
      data.rsvpStatus &&
      data.rsvpStatus !== "YES" &&
      invite.rsvpStatus === "YES";

    const updated = await prisma.eventInvite.update({
      where: { id: inviteId },
      data: {
        ...data,
        ...(data.rsvpStatus === "YES" || data.rsvpStatus === "NO" || data.rsvpStatus === "MAYBE"
          ? { rsvpDate: new Date() }
          : {}),
        ...(clearSeating ? { tableId: null, seatIndex: null } : {}),
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
