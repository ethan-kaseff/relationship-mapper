import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { exchangeCode, storeTokens } from "@/lib/constant-contact";

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
      console.error("CC OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?cc_error=auth_denied", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?cc_error=no_code", request.url)
      );
    }

    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const tokens = await exchangeCode(code);
    await storeTokens(
      officeId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in
    );

    return NextResponse.redirect(new URL("/settings?cc_connected=true", request.url));
  } catch (error) {
    console.error("Error in CC callback:", error);
    return NextResponse.redirect(
      new URL("/settings?cc_error=token_exchange", request.url)
    );
  }
}
