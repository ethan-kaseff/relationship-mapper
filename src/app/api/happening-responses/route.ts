import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createHappeningResponseSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const happeningResponses = await prisma.happeningResponse.findMany({
      include: {
        person: true,
        happening: true,
      },
    });
    return NextResponse.json(happeningResponses);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createHappeningResponseSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;
    const happeningResponse = await prisma.happeningResponse.create({
      data: {
        peopleId: data.peopleId,
        happeningId: data.happeningId,
        responseDate: data.responseDate ? new Date(data.responseDate) : null,
        responseTime: data.responseTime,
        responseNotes: data.responseNotes,
        isPublic: data.isPublic ?? true,
        platform: data.platform,
        platformLink: data.platformLink,
      },
    });
    return NextResponse.json(happeningResponse, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
