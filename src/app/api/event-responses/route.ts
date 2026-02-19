import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const eventResponses = await prisma.eventResponse.findMany({
      include: {
        person: true,
        event: true,
      },
    });
    return NextResponse.json(eventResponses);
  } catch (error) {
    console.error("Failed to fetch event responses:", error);
    return NextResponse.json(
      { error: "Failed to fetch event responses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventResponse = await prisma.eventResponse.create({
      data: {
        peopleId: body.peopleId,
        eventId: body.eventId,
        responseDate: body.responseDate ? new Date(body.responseDate) : null,
        responseTime: body.responseTime,
        responseNotes: body.responseNotes,
        isPublic: body.isPublic ?? true,
      },
    });
    return NextResponse.json(eventResponse, { status: 201 });
  } catch (error) {
    console.error("Failed to create event response:", error);
    return NextResponse.json(
      { error: "Failed to create event response" },
      { status: 500 }
    );
  }
}
