import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError, badRequest, forbidden } from "@/lib/api-error";

// PUT /api/users/:id — update a user (SYSTEM_ADMIN: any, OFFICE_ADMIN: own office only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const { session } = authResult;
  const { id } = await params;
  const isOfficeAdmin = session.user.role === "OFFICE_ADMIN";

  // Office admins can only edit users in their own office
  if (isOfficeAdmin) {
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { officeId: true } });
    if (!targetUser || targetUser.officeId !== session.user.officeId) {
      return forbidden();
    }
  }

  const body = await request.json();

  try {
    const data: Record<string, string> = {};
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.email !== undefined) data.email = body.email;
    if (body.role !== undefined) {
      // Office admins cannot assign SYSTEM_ADMIN role
      if (isOfficeAdmin && body.role === "SYSTEM_ADMIN") {
        return forbidden("Cannot assign System Admin role");
      }
      data.role = body.role;
    }
    // Office admins cannot move users to a different office
    if (body.officeId !== undefined) {
      if (isOfficeAdmin && body.officeId !== session.user.officeId) {
        return forbidden("Cannot move user to another office");
      }
      data.officeId = body.officeId;
    }
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

// DELETE /api/users/:id — delete a user (SYSTEM_ADMIN: any, OFFICE_ADMIN: own office only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const { session } = authResult;
  const { id } = await params;

  // Prevent deleting yourself
  if (id === session.user.id) {
    return badRequest("Cannot delete your own account");
  }

  // Office admins can only delete users in their own office
  if (session.user.role === "OFFICE_ADMIN") {
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { officeId: true } });
    if (!targetUser || targetUser.officeId !== session.user.officeId) {
      return forbidden();
    }
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
