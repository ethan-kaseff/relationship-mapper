import { prisma } from "@/lib/prisma";

/**
 * Per-office Anthropic API keys.
 *
 * Offices are separate legal entities, so each office connects its own
 * Anthropic account and pays for its own AI usage. Keys are stored in
 * IntegrationToken (provider "anthropic"), the same pattern Zeffy uses
 * for its static API key. There is intentionally no fallback to a global
 * env key — that would silently bill the wrong entity.
 */

export async function storeAnthropicApiKey(
  officeId: string,
  apiKey: string
): Promise<void> {
  await prisma.integrationToken.upsert({
    where: {
      officeId_provider: { officeId, provider: "anthropic" },
    },
    create: {
      officeId,
      provider: "anthropic",
      accessToken: apiKey,
      refreshToken: "",
      expiresAt: new Date("2099-12-31"),
    },
    update: {
      accessToken: apiKey,
    },
  });
}

export async function getAnthropicApiKey(officeId: string): Promise<string | null> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      officeId_provider: { officeId, provider: "anthropic" },
    },
  });
  return token?.accessToken ?? null;
}

export async function isAnthropicConnected(officeId: string): Promise<boolean> {
  const key = await getAnthropicApiKey(officeId);
  return !!key;
}

export async function disconnectAnthropic(officeId: string): Promise<void> {
  await prisma.integrationToken.deleteMany({
    where: { officeId, provider: "anthropic" },
  });
}

/**
 * Check a key against the Anthropic API before storing it.
 * The models list endpoint is free and fails with 401 on a bad key.
 */
export async function validateAnthropicApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
