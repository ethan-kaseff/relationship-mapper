import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateHappeningSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const happening = await prisma.happening.findUnique({
      where: { id },
      include: {
        responses: {
          include: {
            person: true,
          },
        },
      },
    });
    if (!happening) {
      return notFound("Happening not found");
    }
    return NextResponse.json(happening);
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

  const validation = await validateBody(request, updateHappeningSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const data = validation.data;
    const happening = await prisma.happening.update({
      where: { id },
      data: {
        happeningDate: data.happeningDate ? new Date(data.happeningDate) : undefined,
        happeningTime: data.happeningTime,
        happeningDescription: data.happeningDescription,
      },
    });
    return NextResponse.json(happening);
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
    await prisma.happening.delete({ where: { id } });
    return NextResponse.json({ message: "Happening deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
