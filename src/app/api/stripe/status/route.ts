import { NextResponse } from "next/server";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const configured = !!process.env.STRIPE_SECRET_KEY;
    return NextResponse.json({ connected: configured });
  } catch (error) {
    return handleApiError(error);
  }
}
