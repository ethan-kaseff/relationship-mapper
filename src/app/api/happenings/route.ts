import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createHappeningSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const happenings = await prisma.happening.findMany({
      include: {
        responses: {
          include: {
            person: true,
          },
        },
      },
    });
    return NextResponse.json(happenings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createHappeningSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;
    const happening = await prisma.happening.create({
      data: {
        happeningDate: new Date(data.happeningDate),
        happeningTime: data.happeningTime,
        happeningDescription: data.happeningDescription,
      },
    });
    return NextResponse.json(happening, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
