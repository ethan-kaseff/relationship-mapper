import { NextResponse } from "next/server";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const token = await prisma.integrationToken.findUnique({
      where: {
        officeId_provider: { officeId, provider: "stripe" },
      },
      select: { providerAccountId: true },
    });

    return NextResponse.json({
      connected: !!token,
      accountId: token?.providerAccountId || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
