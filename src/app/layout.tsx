import type { Metadata } from "next";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";
import MainWrapper from "@/components/MainWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "JCRB Relationship Map",
  description: "Community relationship mapping tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SessionProvider>
          <Navbar />
          <MainWrapper>{children}</MainWrapper>
        </SessionProvider>
      </body>
    </html>
  );
}
