import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
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
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;
      if (pathname === "/login") return true;
      if (!isLoggedIn) return false;

      const role = (auth?.user as { role?: string })?.role;

      // Settings page: SYSTEM_ADMIN and OFFICE_ADMIN only
      if (pathname.startsWith("/settings")) {
        return role === "SYSTEM_ADMIN" || role === "OFFICE_ADMIN";
      }

      // CONNECTOR can only access /interactions and API routes for interactions
      if (role === "CONNECTOR") {
        return pathname === "/" || pathname.startsWith("/interactions") || pathname.startsWith("/api/");
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
        token.officeId = (user as { officeId: string }).officeId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.officeId = token.officeId as string;
      }
      return session;
    },
  },
});
