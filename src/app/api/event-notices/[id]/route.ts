import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { validateBody, updateEventNoticeSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateEventNoticeSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const officeFilter = await getOfficeFilter();
    const existing = await prisma.eventNotice.findFirst({ where: { id, ...officeFilter } });
    if (!existing) return notFound("Notice not found");

    const notice = await prisma.eventNotice.update({
      where: { id },
      data: {
        name: validation.data.name,
        conditions: validation.data.conditions,
        conditionLogic: validation.data.conditionLogic,
        isActive: validation.data.isActive,
        displayOrder: validation.data.displayOrder,
        ...(validation.data.eventId !== undefined && { eventId: validation.data.eventId }),
      },
    });
    return NextResponse.json(notice);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const officeFilter = await getOfficeFilter();
    const existing = await prisma.eventNotice.findFirst({ where: { id, ...officeFilter } });
    if (!existing) return notFound("Notice not found");

    await prisma.eventNotice.delete({ where: { id } });
    return NextResponse.json({ message: "Notice deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
