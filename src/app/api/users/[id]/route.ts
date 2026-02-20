import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSystemAdmin } from "@/lib/api-auth";
import { handleApiError, badRequest } from "@/lib/api-error";

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
