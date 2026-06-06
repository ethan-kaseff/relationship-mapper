import { NextResponse } from "next/server";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { inviteId } = await params;
    const officeId = (authResult.session.user as { officeId: string }).officeId;

    const invite = await prisma.eventInvite.findUnique({
      where: { id: inviteId },
      select: { id: true, isGuest: true, guestName: true, guestEmail: true, eventId: true, event: { select: { officeId: true } } },
    });

    if (!invite || invite.event.officeId !== officeId) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    if (!invite.isGuest) {
      return NextResponse.json({ error: "Invite is not a guest" }, { status: 400 });
    }

    // Parse name from guestName
    const nameParts = (invite.guestName ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "Unknown";

    const person = await prisma.$transaction(async (tx) => {
      const newPerson = await tx.people.create({
        data: { firstName, lastName, email1: invite.guestEmail ?? null, officeId },
      });
      await tx.eventInvite.update({
        where: { id: inviteId },
        data: { peopleId: newPerson.id, isGuest: false, guestName: null, guestEmail: null },
      });
      return newPerson;
    });

    return NextResponse.json({ personId: person.id });
  } catch (error) {
    return handleApiError(error);
  }
}
