import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateEventSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        responses: {
          include: {
            person: true,
          },
        },
      },
    });
    if (!event) {
      return notFound("Event not found");
    }
    return NextResponse.json(event);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateEventSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const data = validation.data;
    const event = await prisma.event.update({
      where: { id },
      data: {
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        eventTime: data.eventTime,
        eventDescription: data.eventDescription,
      },
    });
    return NextResponse.json(event);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ message: "Event deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
