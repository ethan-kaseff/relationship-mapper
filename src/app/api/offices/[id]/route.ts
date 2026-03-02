import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSystemAdmin } from "@/lib/api-auth";
import { handleApiError, badRequest, notFound, conflict } from "@/lib/api-error";

// PUT /api/offices/[id] — update office name
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSystemAdmin();
  if (!authResult.success) return authResult.response;

  const { id } = await params;
  const body = await request.json();
  const { name, isSiloed } = body;

  if (!name || !name.trim()) {
    return badRequest("Office name is required");
  }

  try {
    const data: { name: string; isSiloed?: boolean } = { name: name.trim() };
    if (typeof isSiloed === "boolean") data.isSiloed = isSiloed;

    const office = await prisma.office.update({
      where: { id },
      data,
    });

    return NextResponse.json(office);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/offices/[id] — delete office (only if empty)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSystemAdmin();
  if (!authResult.success) return authResult.response;

  const { id } = await params;

  try {
    const office = await prisma.office.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, people: true, partners: true } },
      },
    });

    if (!office) {
      return notFound("Office not found");
    }

    const total = office._count.users + office._count.people + office._count.partners;
    if (total > 0) {
      return conflict("Cannot delete office that has users, people, or partners assigned to it");
    }

    await prisma.office.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
