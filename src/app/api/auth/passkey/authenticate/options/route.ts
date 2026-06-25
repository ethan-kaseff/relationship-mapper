import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import {
  AUTH_CHALLENGE_COOKIE,
  getWebAuthnContext,
  challengeCookieOptions,
} from "@/lib/webauthn";

// POST /api/auth/passkey/authenticate/options
// Public: returns the WebAuthn options the browser needs to sign in with a
// passkey, and stashes the challenge in a short-lived cookie. No email needed —
// discoverable passkeys let the device offer the right account.
export async function POST(request: Request) {
  const { rpID } = getWebAuthnContext(request);

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });

  const response = NextResponse.json(options);
  response.cookies.set(AUTH_CHALLENGE_COOKIE, options.challenge, challengeCookieOptions());
  return response;
}
