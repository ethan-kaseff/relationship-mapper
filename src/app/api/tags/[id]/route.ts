import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateTagSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";
import { isSystemAdmin } from "@/types/roles";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateTagSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const officeFilter = await getOfficeFilter();
    const existing = await prisma.tag.findFirst({ where: { id, ...officeFilter } });
    if (!existing) return notFound("Tag not found");

    const sessionUser = authResult.session.user as { officeId: string; role: string };
    const updateData: { name: string; officeId?: string } = { name: validation.data.name };
    if (isSystemAdmin(sessionUser.role) && validation.data.officeId) {
      updateData.officeId = validation.data.officeId;
    }
    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(tag);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const officeFilter = await getOfficeFilter();
    const existing = await prisma.tag.findFirst({ where: { id, ...officeFilter } });
    if (!existing) return notFound("Tag not found");

    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ message: "Tag deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
