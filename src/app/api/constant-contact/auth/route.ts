import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getAuthUrl } from "@/lib/constant-contact";

export async function GET() {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const url = getAuthUrl(officeId);
    return NextResponse.redirect(url);
  } catch (error) {
    return handleApiError(error);
  }
}
