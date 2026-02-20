import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireSystemAdmin } from "@/lib/api-auth";
import { handleApiError, badRequest } from "@/lib/api-error";

// PUT /api/users/:id — update a user (SYSTEM_ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSystemAdmin();
  if (!authResult.success) return authResult.response;

  const { id } = await params;
  const body = await request.json();

  try {
    const data: Record<string, string> = {};
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.email !== undefined) data.email = body.email;
    if (body.role !== undefined) data.role = body.role;
    if (body.officeId !== undefined) data.officeId = body.officeId;
    if (body.password) data.password = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      include: { office: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/users/:id — delete a user (SYSTEM_ADMIN only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSystemAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;

    // Prevent deleting yourself
    if (id === authResult.session.user.id) {
      return badRequest("Cannot delete your own account");
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
