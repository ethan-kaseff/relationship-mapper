"use client";

import { usePathname } from "next/navigation";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <main>{children}</main>;
  }

  return <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>;
}
