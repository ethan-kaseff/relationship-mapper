import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, bulkSaveSeatingSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, bulkSaveSeatingSchema);
  if (!validation.success) return validation.response;

  try {
    const { id: eventId } = await params;
    const { seatingLayout, seatAssignments } = validation.data;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return notFound("Event not found");

    // Update layout and all seat assignments in a transaction
    await prisma.$transaction([
      prisma.event.update({
        where: { id: eventId },
        data: { seatingLayout },
      }),
      ...seatAssignments.map((a: { inviteId: string; tableId: string | null; seatIndex: number | null }) =>
        prisma.eventInvite.update({
          where: { id: a.inviteId },
          data: { tableId: a.tableId, seatIndex: a.seatIndex },
        })
      ),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
