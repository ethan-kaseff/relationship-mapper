import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/auth/passkey/credentials
// Lists the signed-in user's passkeys (never returns the public key bytes).
export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  const passkeys = await prisma.passkey.findMany({
    where: { userId: authResult.session.user.id },
    select: {
      id: true,
      name: true,
      deviceType: true,
      backedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ passkeys });
}
