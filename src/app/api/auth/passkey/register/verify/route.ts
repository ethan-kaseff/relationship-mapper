import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { requireAuth } from "@/lib/api-auth";
import { badRequest, conflict } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import {
  REG_CHALLENGE_COOKIE,
  getWebAuthnContext,
  parseCookie,
  bufferToCredentialId,
} from "@/lib/webauthn";

// POST /api/auth/passkey/register/verify
// Verifies the browser's registration response against the stored challenge and,
// on success, saves the new passkey for the signed-in user.
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const userId = authResult.session.user.id;

  let body: { response?: RegistrationResponseJSON; name?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body");
  }
  if (!body.response) return badRequest("Missing registration response");

  const expectedChallenge = parseCookie(request.headers.get("cookie"), REG_CHALLENGE_COOKIE);
  if (!expectedChallenge) {
    return badRequest("Your passkey setup session expired — please try again");
  }

  const { rpID, origin } = getWebAuthnContext(request);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Could not verify passkey");
  }

  if (!verification.verified || !verification.registrationInfo) {
    return badRequest("Could not verify passkey");
  }

  const info = verification.registrationInfo;
  const credentialId = bufferToCredentialId(info.credentialID);

  const duplicate = await prisma.passkey.findUnique({ where: { credentialId } });
  if (duplicate) {
    const response = conflict("This passkey is already registered");
    response.cookies.delete(REG_CHALLENGE_COOKIE);
    return response;
  }

  const transports = body.response.response?.transports?.join(",") ?? null;
  const label =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 60)
      : null;

  await prisma.passkey.create({
    data: {
      userId,
      credentialId,
      publicKey: Buffer.from(info.credentialPublicKey),
      counter: info.counter,
      transports,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      name: label,
    },
  });

  const response = NextResponse.json({ verified: true });
  response.cookies.delete(REG_CHALLENGE_COOKIE);
  return response;
}
