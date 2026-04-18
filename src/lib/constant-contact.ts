import { prisma } from "@/lib/prisma";

const CC_AUTH_BASE = "https://authz.constantcontact.com/oauth2/default/v1";
const CC_TOKEN_URL = `${CC_AUTH_BASE}/token`;
const CC_API_BASE = "https://api.cc.email/v3";

/**
 * Build the Constant Contact OAuth authorization URL.
 */
export function getAuthUrl(officeId: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CONSTANT_CONTACT_API_KEY!,
    redirect_uri: process.env.CONSTANT_CONTACT_REDIRECT_URI!,
    scope: "contact_data campaign_data offline_access",
    state: officeId,
  });
  return `${CC_AUTH_BASE}/authorize?${params}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const credentials = Buffer.from(
    `${process.env.CONSTANT_CONTACT_API_KEY}:${process.env.CONSTANT_CONTACT_SECRET}`
  ).toString("base64");

  const res = await fetch(CC_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.CONSTANT_CONTACT_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CC token exchange failed: ${text}`);
  }

  return res.json();
}

/**
 * Store (or update) Constant Contact tokens in the database.
 */
export async function storeTokens(
  officeId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  await prisma.integrationToken.upsert({
    where: {
      officeId_provider: { officeId, provider: "constant_contact" },
    },
    create: {
      officeId,
      provider: "constant_contact",
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    },
    update: {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    },
  });
}

/**
 * Check if Constant Contact is connected for an office.
 */
export async function isConnected(officeId: string): Promise<boolean> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      officeId_provider: { officeId, provider: "constant_contact" },
    },
  });
  return !!token;
}

/**
 * Disconnect Constant Contact by deleting the stored tokens.
 */
export async function disconnect(officeId: string): Promise<void> {
  await prisma.integrationToken.deleteMany({
    where: { officeId, provider: "constant_contact" },
  });
}

/**
 * Get a valid access token, refreshing if expired.
 */
async function getAccessToken(officeId: string): Promise<string> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      officeId_provider: { officeId, provider: "constant_contact" },
    },
  });

  if (!token) throw new Error("Constant Contact not connected");

  // If token is still valid, return it
  if (token.expiresAt > new Date()) {
    return token.accessToken;
  }

  // Refresh the token
  const credentials = Buffer.from(
    `${process.env.CONSTANT_CONTACT_API_KEY}:${process.env.CONSTANT_CONTACT_SECRET}`
  ).toString("base64");

  const res = await fetch(CC_TOKEN_URL, {
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
    throw new Error("Failed to refresh Constant Contact token");
  }

  const data = await res.json();

  await prisma.integrationToken.update({
    where: {
      officeId_provider: { officeId, provider: "constant_contact" },
    },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

/**
 * Create a contact list in Constant Contact. Returns the list ID.
 */
export async function createContactList(
  officeId: string,
  listName: string
): Promise<string> {
  const accessToken = await getAccessToken(officeId);

  const res = await fetch(`${CC_API_BASE}/contact_lists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: listName,
      favorite: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create CC contact list: ${text}`);
  }

  const data = await res.json();
  return data.list_id;
}

/**
 * Upsert contacts into Constant Contact and add them to a list.
 */
export async function upsertContacts(
  officeId: string,
  contacts: { email: string; first_name: string; last_name: string }[],
  listId: string
): Promise<void> {
  const accessToken = await getAccessToken(officeId);

  // CC v3 bulk import: POST /activities/contacts_json_import
  const importData = {
    import_data: contacts.map((c) => ({
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
    })),
    list_ids: [listId],
  };

  const res = await fetch(`${CC_API_BASE}/activities/contacts_json_import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(importData),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to upsert CC contacts: ${text}`);
  }
}
