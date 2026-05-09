import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateTagSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";

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

    const tag = await prisma.tag.update({
      where: { id },
      data: { name: validation.data.name },
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
