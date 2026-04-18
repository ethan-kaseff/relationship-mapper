import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const clientId = process.env.STRIPE_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/stripe/callback`;

    const url = new URL("https://connect.stripe.com/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId!);
    url.searchParams.set("scope", "read_write");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", officeId);

    return NextResponse.redirect(url.toString());
  } catch (error) {
    return handleApiError(error);
  }
}
