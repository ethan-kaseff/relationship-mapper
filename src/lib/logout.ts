import { signOut } from "next-auth/react";

/**
 * Sign out and return to `path` on the CURRENT origin.
 *
 * We clear the session with `redirect: false` and then navigate with
 * `window.location` ourselves, instead of handing NextAuth a `callbackUrl`.
 * NextAuth resolves a relative `callbackUrl` against its configured base URL
 * (NEXTAUTH_URL/AUTH_URL), which in some environments points at a different
 * Vercel domain than the one the user is on — sending logout to the wrong site.
 * Navigating via `window.location` keeps the user on the domain they're using.
 */
export async function logoutTo(path: string = "/"): Promise<void> {
  await signOut({ redirect: false });
  window.location.href = path;
}
