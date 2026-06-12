import { NextResponse } from "next/server";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { isAnthropicConnected } from "@/lib/anthropic-keys";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const connected = await isAnthropicConnected(officeId);
    return NextResponse.json({ connected });
  } catch (error) {
    return handleApiError(error);
  }
}
