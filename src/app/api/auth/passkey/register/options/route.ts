import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  RP_NAME,
  REG_CHALLENGE_COOKIE,
  getWebAuthnContext,
  credentialIdToBuffer,
  parseTransports,
  challengeCookieOptions,
} from "@/lib/webauthn";

// POST /api/auth/passkey/register/options
// Returns the WebAuthn options the browser needs to create a new passkey for
// the signed-in user, and stashes the challenge in a short-lived cookie.
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  const { id: userId, email, name } = authResult.session.user;
  const { rpID } = getWebAuthnContext(request);

  const existing = await prisma.passkey.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: userId,
    userName: email,
    userDisplayName: name,
    attestationType: "none",
    // Stop the user re-registering a credential their device already holds.
    excludeCredentials: existing.map((p) => ({
      id: credentialIdToBuffer(p.credentialId),
      type: "public-key" as const,
      transports: parseTransports(p.transports),
    })),
    authenticatorSelection: {
      // "preferred" resident keys make the passkey discoverable, so the user
      // can sign in later without first typing their email.
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const response = NextResponse.json(options);
  response.cookies.set(REG_CHALLENGE_COOKIE, options.challenge, challengeCookieOptions());
  return response;
}
