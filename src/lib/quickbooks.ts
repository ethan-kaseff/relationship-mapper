import { prisma } from "@/lib/prisma";

const QB_BASE_URL = process.env.QB_ENVIRONMENT === "production"
  ? "https://quickbooks.api.intuit.com"
  : "https://sandbox-quickbooks.api.intuit.com";

const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export function getQBAuthUrl(officeId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.QB_CLIENT_ID!,
    redirect_uri: process.env.QB_REDIRECT_URI!,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state: officeId,
  });
  return `${QB_AUTH_URL}?${params}`;
}

export async function exchangeQBCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  realmId: string;
}> {
  const credentials = Buffer.from(
    `${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.QB_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QB token exchange failed: ${text}`);
  }

  return res.json();
}

export async function refreshQBToken(officeId: string): Promise<string> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      officeId_provider: { officeId, provider: "quickbooks" },
    },
  });

  if (!token) throw new Error("QuickBooks not connected");

  // If token is still valid, return it
  if (token.expiresAt > new Date()) {
    return token.accessToken;
  }

  // Refresh the token
  const credentials = Buffer.from(
    `${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh QuickBooks token");
  }

  const data = await res.json();

  await prisma.integrationToken.update({
    where: {
      officeId_provider: { officeId, provider: "quickbooks" },
    },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

export async function getQBRealmId(officeId: string): Promise<string> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      officeId_provider: { officeId, provider: "quickbooks" },
    },
    select: { providerAccountId: true },
  });

  if (!token?.providerAccountId) throw new Error("QuickBooks not connected");
  return token.providerAccountId;
}

/**
 * Create a single daily Sales Receipt in QuickBooks that sums all donations for a given date.
 * This matches how Stripe batches payouts to the bank (one deposit per day).
 */
export async function createDailySalesReceipt(
  officeId: string,
  date: string, // YYYY-MM-DD
  donations: { id: string; amount: number; donorName: string | null }[],
  fundraiserTitle: string
): Promise<string> {
  const accessToken = await refreshQBToken(officeId);
  const realmId = await getQBRealmId(officeId);

  const totalCents = donations.reduce((sum, d) => sum + d.amount, 0);
  const donorCount = donations.length;

  const receipt = {
    Line: [
      {
        Amount: totalCents / 100,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { value: "1", name: "Services" },
        },
        Description: `${fundraiserTitle} — ${donorCount} donation${donorCount !== 1 ? "s" : ""} on ${date}`,
      },
    ],
    CustomerRef: {
      value: "1",
    },
    TxnDate: date,
    PrivateNote: `Daily batch: ${donorCount} donation${donorCount !== 1 ? "s" : ""} totaling $${(totalCents / 100).toFixed(2)}`,
    CustomerMemo: {
      value: `${fundraiserTitle} donations — ${date}`,
    },
  };

  const res = await fetch(
    `${QB_BASE_URL}/v3/company/${realmId}/salesreceipt?minorversion=65`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      body: JSON.stringify(receipt),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create QB Sales Receipt: ${text}`);
  }

  const data = await res.json();
  return data.SalesReceipt.Id;
}

export async function isQBConnected(officeId: string): Promise<boolean> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      officeId_provider: { officeId, provider: "quickbooks" },
    },
  });
  return !!token;
}

/**
 * Sync all unsynced approved donations for a fundraiser, grouped by day.
 * Creates one Sales Receipt per day in QuickBooks.
 * Returns { synced, errors } counts.
 */
export async function syncDonationsByDay(
  fundraiserId: string,
  officeId: string
): Promise<{ synced: number; errors: number; receiptCount: number }> {
  const donations = await prisma.donation.findMany({
    where: {
      fundraiserId,
      qbSyncStatus: { in: ["NOT_SYNCED", "ERROR"] },
      approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
    },
    include: { fundraiser: { select: { title: true } } },
    orderBy: { donatedAt: "asc" },
  });

  if (donations.length === 0) return { synced: 0, errors: 0, receiptCount: 0 };

  // Group donations by date (YYYY-MM-DD)
  const byDate = new Map<string, typeof donations>();
  for (const d of donations) {
    const dateKey = d.donatedAt.toISOString().split("T")[0];
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(d);
  }

  let synced = 0;
  let errors = 0;
  let receiptCount = 0;
  const fundraiserTitle = donations[0].fundraiser.title;

  for (const [date, dayDonations] of byDate) {
    try {
      const receiptId = await createDailySalesReceipt(
        officeId,
        date,
        dayDonations.map((d) => ({
          id: d.id,
          amount: d.amount,
          donorName: d.donorName,
        })),
        fundraiserTitle
      );

      // Mark all donations in this day as synced with the same receipt ID
      await prisma.donation.updateMany({
        where: { id: { in: dayDonations.map((d) => d.id) } },
        data: {
          qbSyncStatus: "SYNCED",
          qbReceiptId: receiptId,
        },
      });

      synced += dayDonations.length;
      receiptCount++;
    } catch (error) {
      console.error(`QB sync error for ${date}:`, error);

      await prisma.donation.updateMany({
        where: { id: { in: dayDonations.map((d) => d.id) } },
        data: { qbSyncStatus: "ERROR" },
      });

      errors += dayDonations.length;
    }
  }

  return { synced, errors, receiptCount };
}
