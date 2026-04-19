import { NextResponse } from "next/server";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { syncZeffyDonations, syncZeffyContacts } from "@/lib/zeffy";

export async function POST() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;

    const [donationResults, contactResults] = await Promise.all([
      syncZeffyDonations(officeId),
      syncZeffyContacts(officeId),
    ]);

    return NextResponse.json({
      donations: donationResults,
      contacts: contactResults,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
