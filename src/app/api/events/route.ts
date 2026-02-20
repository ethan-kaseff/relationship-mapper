import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createEventSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const events = await prisma.event.findMany({
      include: {
        responses: {
          include: {
            person: true,
          },
        },
      },
    });
    return NextResponse.json(events);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createEventSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;
    const event = await prisma.event.create({
      data: {
        eventDate: new Date(data.eventDate),
        eventTime: data.eventTime,
        eventDescription: data.eventDescription,
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
