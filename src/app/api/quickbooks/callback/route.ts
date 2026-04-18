import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { exchangeQBCode } from "@/lib/quickbooks";

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const realmId = searchParams.get("realmId");
    const error = searchParams.get("error");

    if (error) {
      console.error("QB OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?qb_error=auth_denied", request.url)
      );
    }

    if (!code || !realmId) {
      return NextResponse.redirect(
        new URL("/settings?qb_error=no_code", request.url)
      );
    }

    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const tokens = await exchangeQBCode(code);

    await prisma.integrationToken.upsert({
      where: {
        officeId_provider: { officeId, provider: "quickbooks" },
      },
      create: {
        officeId,
        provider: "quickbooks",
        providerAccountId: realmId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      update: {
        providerAccountId: realmId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return NextResponse.redirect(new URL("/settings?qb_connected=true", request.url));
  } catch (error) {
    console.error("Error in QB callback:", error);
    return NextResponse.redirect(
      new URL("/settings?qb_error=token_exchange", request.url)
    );
  }
}
