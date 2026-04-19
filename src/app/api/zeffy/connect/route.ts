import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { validateBody, zeffyConnectSchema } from "@/lib/validations";
import { storeZeffyApiKey, validateZeffyApiKey } from "@/lib/zeffy";

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, zeffyConnectSchema);
  if (!validation.success) return validation.response;

  try {
    const { apiKey } = validation.data;

    // Validate the API key by making a test request
    const isValid = await validateZeffyApiKey(apiKey);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid API key. Please check your Zeffy API key and try again." },
        { status: 400 }
      );
    }

    const officeId = (authResult.session.user as { officeId: string }).officeId;
    await storeZeffyApiKey(officeId, apiKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
