import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";
import crypto from "crypto";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;

    const existing = await prisma.people.findUnique({ where: { id } });
    if (!existing) return notFound("Person not found");

    const token = crypto.randomUUID();
    const person = await prisma.people.update({
      where: { id },
      data: { connectorToken: token },
    });

    return NextResponse.json({ connectorToken: person.connectorToken });
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

    const existing = await prisma.people.findUnique({ where: { id } });
    if (!existing) return notFound("Person not found");

    await prisma.people.update({
      where: { id },
      data: { connectorToken: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
