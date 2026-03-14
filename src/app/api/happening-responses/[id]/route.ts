import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateHappeningResponseSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateHappeningResponseSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const data = validation.data;
    const happeningResponse = await prisma.happeningResponse.update({
      where: { id },
      data: {
        responseDate: data.responseDate ? new Date(data.responseDate) : undefined,
        responseTime: data.responseTime,
        responseNotes: data.responseNotes,
        isPublic: data.isPublic,
        platform: data.platform,
        platformLink: data.platformLink,
      },
    });
    return NextResponse.json(happeningResponse);
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
    await prisma.happeningResponse.delete({ where: { id } });
    return NextResponse.json({ message: "Happening response deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
