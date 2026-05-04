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
    const goalAmount = typeof body.goalAmount === "number" ? Math.round(body.goalAmount) : 0;

    const event = await prisma.event.findFirst({ where: { id, officeId }, select: { id: true, title: true } });
    if (!event) return notFound("Event not found");

    const existing = await prisma.fundraiser.findFirst({ where: { eventId: id } });
    if (existing) return NextResponse.json({ error: "A fundraiser is already linked to this event." }, { status: 409 });

    const baseSlug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${Date.now()}`;

    const fundraiser = await prisma.fundraiser.create({
      data: { title: event.title, goalAmount, slug, eventId: id, officeId, isActive: true },
    });

    return NextResponse.json(fundraiser, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
