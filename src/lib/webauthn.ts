import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";

/**
 * Shared helpers for the passkey (WebAuthn) sign-in flow.
 *
 * This module is server-only — it pulls in `@simplewebauthn/server`. Client
 * components must import from `@simplewebauthn/browser` instead, never from here.
 */

/** User-visible name shown in the operating system's passkey prompt. */
export const RP_NAME = process.env.WEBAUTHN_RP_NAME || "JCRB Relationship Map";

/** Cookie names that hold the single-use challenge between the two round-trips. */
export const REG_CHALLENGE_COOKIE = "pk_reg_challenge";
export const AUTH_CHALLENGE_COOKIE = "pk_auth_challenge";

/** How long a challenge cookie stays valid, in seconds. */
export const CHALLENGE_TTL_SECONDS = 300;

/**
 * Derive the Relying Party ID (the bare domain) from an origin URL. Passkeys are
 * bound to this domain. We derive it per-request rather than hardcoding so that
 * localhost, Vercel preview URLs, and production each use their own domain.
 */
export function deriveRpID(origin: string): string {
  return new URL(origin).hostname;
}

/** Resolve the WebAuthn relying-party context from the incoming request. */
export function getWebAuthnContext(request: Request): { rpID: string; origin: string } {
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  return { rpID: deriveRpID(origin), origin };
}

/** Read a single cookie value out of a raw Cookie header. */
export function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

/** base64url credential ID (as stored in the DB) -> bytes. */
export function credentialIdToBuffer(credentialId: string): Uint8Array {
  return isoBase64URL.toBuffer(credentialId);
}

/** bytes -> base64url credential ID (for storing in the DB). */
export function bufferToCredentialId(buffer: Uint8Array): string {
  return isoBase64URL.fromBuffer(buffer);
}

/** Stored comma-separated transports -> typed array (or undefined when empty). */
export function parseTransports(
  value: string | null | undefined
): AuthenticatorTransportFuture[] | undefined {
  if (!value) return undefined;
  const list = value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return list.length ? (list as AuthenticatorTransportFuture[]) : undefined;
}

/** Cookie options for the short-lived challenge cookies. */
export function challengeCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  };
}
