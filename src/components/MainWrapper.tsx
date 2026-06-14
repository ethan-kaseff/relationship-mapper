"use client";

import { usePathname } from "next/navigation";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <main>{children}</main>;
  }

  // Data-heavy detail pages (fundraiser, event) have wide tables — let them use
  // the full screen width instead of the 1280px reading column.
  const isWide = /^\/(fundraisers|events)\/[^/]+/.test(pathname);
  if (isWide) {
    return <main className="mx-auto px-4 py-6">{children}</main>;
  }

  return <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>;
}
