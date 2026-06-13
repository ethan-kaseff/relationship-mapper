import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound, badRequest } from "@/lib/api-error";
import { z } from "zod";
import type { SeatingLayout } from "@/types/seating";

function layoutTableCount(layout: unknown): number {
  if (layout && typeof layout === "object" && Array.isArray((layout as SeatingLayout).tables)) {
    return (layout as SeatingLayout).tables.length;
  }
  return 0;
}

// List other events in the same office that have a saved seating layout
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const current = await prisma.event.findUnique({ where: { id }, select: { officeId: true } });
    if (!current) return notFound("Event not found");

    const candidates = await prisma.event.findMany({
      where: { officeId: current.officeId, id: { not: id } },
      select: { id: true, title: true, eventDate: true, seatingLayout: true },
      orderBy: { eventDate: "desc" },
    });

    const withLayout = candidates
      .map((e) => ({ id: e.id, title: e.title, eventDate: e.eventDate, tableCount: layoutTableCount(e.seatingLayout) }))
      .filter((e) => e.tableCount > 0);

    return NextResponse.json(withLayout);
  } catch (error) {
    return handleApiError(error);
  }
}

const copySchema = z.object({ sourceEventId: z.string().uuid() });

// Copy another event's layout into this event, clearing all guest seating
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = copySchema.safeParse(body);
    if (!parsed.success) return badRequest("A source event is required");

    const current = await prisma.event.findUnique({ where: { id }, select: { officeId: true } });
    if (!current) return notFound("Event not found");

    const source = await prisma.event.findUnique({
      where: { id: parsed.data.sourceEventId },
      select: { officeId: true, seatingLayout: true },
    });
    if (!source) return notFound("Source event not found");
    if (source.officeId !== current.officeId) return badRequest("Can only copy a layout from your own office");
    if (layoutTableCount(source.seatingLayout) === 0) {
      return badRequest("That event doesn't have a saved seating layout yet");
    }

    // Copy room, tables, and objects — but strip every guest from the seats,
    // since the new event has its own guest list.
    const layout = source.seatingLayout as unknown as SeatingLayout;
    const cleanLayout: SeatingLayout = {
      ...layout,
      tables: layout.tables.map((t) => ({
        ...t,
        seats: t.seats.map(() => ({ guestId: null })),
      })),
    };

    await prisma.$transaction([
      prisma.event.update({ where: { id }, data: { seatingLayout: cleanLayout as unknown as Prisma.InputJsonValue } }),
      // Return this event's guests to the unassigned pool
      prisma.eventInvite.updateMany({
        where: { eventId: id },
        data: { tableId: null, seatIndex: null },
      }),
    ]);

    return NextResponse.json({ success: true, tableCount: cleanLayout.tables.length });
  } catch (error) {
    return handleApiError(error);
  }
}
