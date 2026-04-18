import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateFundraiserSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const fundraiser = await prisma.fundraiser.findUnique({
      where: { id },
      include: {
        donations: {
          orderBy: { donatedAt: "desc" },
          include: { person: { select: { id: true, firstName: true, lastName: true } } },
        },
        event: { select: { id: true, title: true } },
      },
    });
    if (!fundraiser) return notFound("Fundraiser not found");
    return NextResponse.json(fundraiser);
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

  const validation = await validateBody(request, updateFundraiserSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const data = validation.data;
    const fundraiser = await prisma.fundraiser.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        goalAmount: data.goalAmount,
        presetAmounts: data.presetAmounts,
        slug: data.slug,
        startDate: data.startDate !== undefined
          ? (data.startDate ? new Date(data.startDate) : null)
          : undefined,
        endDate: data.endDate !== undefined
          ? (data.endDate ? new Date(data.endDate) : null)
          : undefined,
        isActive: data.isActive,
        eventId: data.eventId,
      },
    });
    return NextResponse.json(fundraiser);
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
    await prisma.fundraiser.delete({ where: { id } });
    return NextResponse.json({ message: "Fundraiser deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
