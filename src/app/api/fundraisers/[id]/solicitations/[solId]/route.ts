import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; solId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id: fundraiserId, solId } = await params;
    const { status } = await request.json() as { status: string };

    const existing = await prisma.fundraiserSolicitation.findFirst({ where: { id: solId, fundraiserId } });
    if (!existing) return notFound("Solicitation not found");

    const updated = await prisma.fundraiserSolicitation.update({
      where: { id: solId },
      data: { status },
      include: { person: { select: { id: true, firstName: true, lastName: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; solId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id: fundraiserId, solId } = await params;
    const existing = await prisma.fundraiserSolicitation.findFirst({ where: { id: solId, fundraiserId } });
    if (!existing) return notFound("Solicitation not found");

    await prisma.fundraiserSolicitation.delete({ where: { id: solId } });
    return NextResponse.json({ message: "Removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
