import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector, requireAdmin } from "@/lib/api-auth";
import { validateBody, createEventNoticeSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";

export async function GET(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const fundraiserId = searchParams.get("fundraiserId");
    const officeFilter = await getOfficeFilter();
    const notices = await prisma.eventNotice.findMany({
      where: {
        ...officeFilter,
        ...(eventId ? { eventId } : {}),
        ...(fundraiserId ? { fundraiserId } : {}),
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(notices);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createEventNoticeSchema);
  if (!validation.success) return validation.response;

  try {
    const { officeId, id: createdById } = authResult.session.user as { officeId: string; id: string };
    const notice = await prisma.eventNotice.create({
      data: {
        name: validation.data.name,
        conditions: validation.data.conditions,
        conditionLogic: validation.data.conditionLogic,
        isActive: validation.data.isActive,
        displayOrder: validation.data.displayOrder,
        eventId: validation.data.eventId ?? null,
        fundraiserId: validation.data.fundraiserId ?? null,
        officeId,
        createdById,
      },
    });
    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
