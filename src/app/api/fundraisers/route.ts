import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createFundraiserSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const officeFilter = await getOfficeFilter();
    const fundraisers = await prisma.fundraiser.findMany({
      where: officeFilter,
      include: {
        _count: { select: { donations: true } },
        event: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(fundraisers);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createFundraiserSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;
    const officeId = (authResult.session.user as { officeId: string }).officeId;

    const fundraiser = await prisma.fundraiser.create({
      data: {
        title: data.title,
        description: data.description,
        goalAmount: data.goalAmount,
        presetAmounts: data.presetAmounts ?? [2500, 5000, 10000],
        slug: data.slug,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive ?? true,
        eventId: data.eventId ?? null,
        officeId,
      },
    });

    return NextResponse.json(fundraiser, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
