import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { disconnectAnthropic } from "@/lib/anthropic-keys";

export async function POST() {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    await disconnectAnthropic(officeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
