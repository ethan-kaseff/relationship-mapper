import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { prisma } from "@/lib/prisma";
import {
  AUTH_CHALLENGE_COOKIE,
  getWebAuthnContext,
  parseCookie,
  credentialIdToBuffer,
  parseTransports,
} from "@/lib/webauthn";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { office: { select: { isSiloed: true } } },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          officeId: user.officeId,
          isSiloed: user.office.isSiloed,
        };
      },
    }),
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: { response: { label: "Passkey", type: "text" } },
      async authorize(credentials, request) {
        const raw = credentials?.response;
        if (typeof raw !== "string") return null;

        let assertion: AuthenticationResponseJSON;
        try {
          assertion = JSON.parse(raw);
        } catch {
          return null;
        }

        // The challenge was set as an httpOnly cookie by the matching
        // /api/auth/passkey/authenticate/options request.
        const expectedChallenge = parseCookie(
          request.headers.get("cookie"),
          AUTH_CHALLENGE_COOKIE
        );
        if (!expectedChallenge) return null;

        const { rpID, origin } = getWebAuthnContext(request);

        const passkey = await prisma.passkey.findUnique({
          where: { credentialId: assertion.id },
          include: { user: { include: { office: { select: { isSiloed: true } } } } },
        });
        if (!passkey) return null;

        let verification;
        try {
          verification = await verifyAuthenticationResponse({
            response: assertion,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
              credentialID: credentialIdToBuffer(passkey.credentialId),
              credentialPublicKey: passkey.publicKey,
              counter: passkey.counter,
              transports: parseTransports(passkey.transports),
            },
            requireUserVerification: false,
          });
        } catch {
          return null;
        }

        if (!verification.verified) return null;

        // Persist the rolling counter to help detect cloned authenticators.
        await prisma.passkey.update({
          where: { id: passkey.id },
          data: {
            counter: verification.authenticationInfo.newCounter,
            lastUsedAt: new Date(),
          },
        });

        const { user } = passkey;
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          officeId: user.officeId,
          isSiloed: user.office.isSiloed,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;
      if (pathname === "/" || pathname === "/login") return true;
      if (pathname.startsWith("/donate") || pathname.startsWith("/api/donate")) return true;
      if (!isLoggedIn) return false;

      const role = (auth?.user as { role?: string })?.role;

      // Settings page: SYSTEM_ADMIN and OFFICE_ADMIN only
      if (pathname.startsWith("/settings")) {
        return role === "SYSTEM_ADMIN" || role === "OFFICE_ADMIN";
      }

      // CONNECTOR can only access dashboard, interactions, and API routes
      if (role === "CONNECTOR") {
        return pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/interactions") || pathname.startsWith("/api/");
      }

      // VIEWER can access people, partners, relationships, interactions, happenings, and API routes
      if (role === "VIEWER") {
        return (
          pathname.startsWith("/people") ||
          pathname.startsWith("/partners") ||
          pathname.startsWith("/relationships") ||
          pathname.startsWith("/interactions") ||
          pathname.startsWith("/happenings") ||
          pathname.startsWith("/api/")
        );
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
        token.officeId = (user as { officeId: string }).officeId;
        token.isSiloed = (user as { isSiloed: boolean }).isSiloed;
      }
      // Backfill isSiloed for existing tokens that predate this field
      if (token.officeId && token.isSiloed === undefined) {
        try {
          const office = await prisma.office.findUnique({
            where: { id: token.officeId as string },
            select: { isSiloed: true },
          });
          token.isSiloed = office?.isSiloed ?? false;
        } catch {
          token.isSiloed = false;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.officeId = token.officeId as string;
        session.user.isSiloed = (token.isSiloed as boolean) ?? false;
      }
      return session;
    },
  },
});
