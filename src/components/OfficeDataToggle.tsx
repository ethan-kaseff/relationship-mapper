"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface OfficeDataToggleProps {
  onToggle?: (viewAll: boolean) => void;
}

export default function OfficeDataToggle({ onToggle }: OfficeDataToggleProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [viewAll, setViewAll] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )viewAllOffices=([^;]*)/);
    setViewAll(match?.[1] === "true");
    setMounted(true);
  }, []);

  const role = session?.user?.role;
  const isSiloed = (session?.user as { isSiloed?: boolean } | undefined)?.isSiloed;

  // Hide until mounted (avoids hydration mismatch), for system admins, siloed users, or unauthenticated
  if (!mounted || !session?.user || role === "SYSTEM_ADMIN" || isSiloed) return null;

  function toggle() {
    const next = !viewAll;
    document.cookie = `viewAllOffices=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setViewAll(next);
    router.refresh();
    onToggle?.(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        viewAll
          ? "bg-indigo-100 text-indigo-600 border border-indigo-300"
          : "bg-gray-100 text-gray-600 border border-gray-300"
      }`}
    >
      {viewAll ? "All Offices" : "My Office"}
    </button>
  );
}
