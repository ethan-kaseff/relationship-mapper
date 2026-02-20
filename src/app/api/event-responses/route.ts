import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createEventResponseSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const eventResponses = await prisma.eventResponse.findMany({
      include: {
        person: true,
        event: true,
      },
    });
    return NextResponse.json(eventResponses);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createEventResponseSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;
    const eventResponse = await prisma.eventResponse.create({
      data: {
        peopleId: data.peopleId,
        eventId: data.eventId,
        responseDate: data.responseDate ? new Date(data.responseDate) : null,
        responseTime: data.responseTime,
        responseNotes: data.responseNotes,
        isPublic: data.isPublic ?? true,
      },
    });
    return NextResponse.json(eventResponse, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
