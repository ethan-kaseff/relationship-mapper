import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const body = await request.json().catch(() => ({}));

    const fundraiser = await prisma.fundraiser.findFirst({
      where: { id, officeId },
      select: { id: true, title: true, eventId: true },
    });
    if (!fundraiser) return notFound("Fundraiser not found");
    if (fundraiser.eventId) {
      return NextResponse.json({ error: "An event is already linked to this fundraiser." }, { status: 409 });
    }

    const eventDate = body.eventDate ? new Date(body.eventDate) : null;
    const eventTime = typeof body.eventTime === "string" ? body.eventTime : null;
    const location = typeof body.location === "string" ? body.location : null;

    const event = await prisma.event.create({
      data: {
        title: fundraiser.title,
        eventDate,
        eventTime,
        location,
        officeId,
        createdById: authResult.session.user.id as string,
      },
    });

    await prisma.fundraiser.update({
      where: { id },
      data: { eventId: event.id },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
