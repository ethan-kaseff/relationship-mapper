import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNonViewer } from "@/lib/api-auth";
import { validateBody, updateConnectionSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const connection = await prisma.connection.findUnique({
      where: { id },
      include: {
        person: true,
        partnerRole: {
          include: {
            partner: true,
          },
        },
      },
    });
    if (!connection) {
      return notFound("Connection not found");
    }
    return NextResponse.json(connection);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonViewer();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateConnectionSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const data = validation.data;
    const connection = await prisma.connection.update({
      where: { id },
      data: {
        connectionDate: data.connectionDate
          ? new Date(data.connectionDate)
          : undefined,
        connectionTime: data.connectionTime,
        notes: data.notes,
      },
    });
    return NextResponse.json(connection);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonViewer();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    await prisma.connection.delete({ where: { id } });
    return NextResponse.json({ message: "Connection deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
