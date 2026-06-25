"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import IdleTimeout from "@/components/IdleTimeout";

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <IdleTimeout />
      {children}
    </NextAuthSessionProvider>
  );
}
