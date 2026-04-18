import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Stripe OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?stripe_error=auth_denied", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?stripe_error=no_code", request.url)
      );
    }

    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const stripe = getStripeClient();

    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    await prisma.integrationToken.upsert({
      where: {
        officeId_provider: { officeId, provider: "stripe" },
      },
      create: {
        officeId,
        provider: "stripe",
        providerAccountId: response.stripe_user_id,
        accessToken: response.access_token!,
        refreshToken: response.refresh_token || "",
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // Stripe tokens don't expire
      },
      update: {
        providerAccountId: response.stripe_user_id,
        accessToken: response.access_token!,
        refreshToken: response.refresh_token || "",
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.redirect(new URL("/settings?stripe_connected=true", request.url));
  } catch (error) {
    console.error("Error in Stripe callback:", error);
    return NextResponse.redirect(
      new URL("/settings?stripe_error=token_exchange", request.url)
    );
  }
}
