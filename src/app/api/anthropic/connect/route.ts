import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { validateBody, anthropicConnectSchema } from "@/lib/validations";
import { storeAnthropicApiKey, validateAnthropicApiKey } from "@/lib/anthropic-keys";

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, anthropicConnectSchema);
  if (!validation.success) return validation.response;

  try {
    const { apiKey } = validation.data;

    const isValid = await validateAnthropicApiKey(apiKey);
    if (!isValid) {
      return NextResponse.json(
        { error: "Anthropic rejected this key. Check that it was copied completely and hasn't been revoked." },
        { status: 400 }
      );
    }

    const officeId = (authResult.session.user as { officeId: string }).officeId;
    await storeAnthropicApiKey(officeId, apiKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
