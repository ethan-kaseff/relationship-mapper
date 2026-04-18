import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getQBAuthUrl } from "@/lib/quickbooks";

export async function GET() {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const url = getQBAuthUrl(officeId);
    return NextResponse.redirect(url);
  } catch (error) {
    return handleApiError(error);
  }
}
