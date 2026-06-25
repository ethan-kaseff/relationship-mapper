import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { notFound } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

// DELETE /api/auth/passkey/credentials/[id]
// Removes one of the signed-in user's passkeys (scoped to the owner).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  const { id } = await params;

  const passkey = await prisma.passkey.findUnique({ where: { id } });
  if (!passkey || passkey.userId !== authResult.session.user.id) {
    return notFound("Passkey not found");
  }

  await prisma.passkey.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
