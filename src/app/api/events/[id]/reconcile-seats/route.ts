import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";

// Tops up each sponsor group's TBD placeholder seats so the total invites
// (named + TBD) reach the seats that group is expected to use (the donation's
// seatsUsed). Only ADDS placeholders — it never removes a named guest, so an
// over-allocated group (more named guests than paid seats) is left untouched.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id: eventId } = await params;
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) return notFound("Event not found");

    // Expected seats per group = sum of seatsUsed across that group's donations.
    const donations = await prisma.donation.findMany({
      where: { fundraiser: { eventId }, approvalStatus: { not: "REJECTED" } },
      select: { seatsUsed: true, donorName: true, partner: { select: { organizationName: true } } },
    });
    const expectedByGroup = new Map<string, number>();
    for (const d of donations) {
      const group = d.partner?.organizationName ?? d.donorName ?? null;
      if (!group || d.seatsUsed == null || d.seatsUsed <= 0) continue;
      expectedByGroup.set(group, (expectedByGroup.get(group) ?? 0) + d.seatsUsed);
    }

    // Current invite count per group (named + placeholders).
    const invites = await prisma.eventInvite.findMany({
      where: { eventId },
      select: { group: true },
    });
    const currentByGroup = new Map<string, number>();
    for (const i of invites) {
      if (!i.group) continue;
      currentByGroup.set(i.group, (currentByGroup.get(i.group) ?? 0) + 1);
    }

    // rsvpStatus YES so the new placeholders appear in the seating chart (which
    // only shows confirmed guests) and can be auto-seated.
    const toCreate: {
      eventId: string; peopleId: null; isPlaceholder: true; group: string;
      ticketType: string; rsvpStatus: string;
    }[] = [];
    for (const [group, expected] of expectedByGroup) {
      const missing = expected - (currentByGroup.get(group) ?? 0);
      for (let i = 0; i < missing; i++) {
        toCreate.push({ eventId, peopleId: null, isPlaceholder: true, group, ticketType: "Regular", rsvpStatus: "YES" });
      }
    }

    if (toCreate.length > 0) {
      await prisma.eventInvite.createMany({ data: toCreate });
    }

    return NextResponse.json({ created: toCreate.length });
  } catch (error) {
    return handleApiError(error);
  }
}
