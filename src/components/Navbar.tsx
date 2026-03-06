"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

const allNavLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/people", label: "People" },
  { href: "/partners", label: "Partners" },
  { href: "/relationships", label: "Relationships" },
  { href: "/interactions", label: "Interactions" },
  { href: "/happenings", label: "Responses" },
  { href: "/settings", label: "Settings" },
];

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "System Admin",
  OFFICE_ADMIN: "Office Admin",
  OFFICE_USER: "Office User",
  CONNECTOR: "Connector",
};

function getNavLinks(role: string) {
  if (role === "CONNECTOR") {
    return allNavLinks.filter((l) => l.href === "/" || l.href === "/interactions");
  }
  if (role === "OFFICE_USER") {
    return allNavLinks.filter((l) => l.href !== "/settings");
  }
  return allNavLinks;
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [viewAll, setViewAll] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )viewAllOffices=([^;]*)/);
    setViewAll(match?.[1] === "true");
    setMounted(true);
  }, []);

  if (!mounted || pathname === "/login" || status !== "authenticated") return null;

  const role = session.user.role;
  const navLinks = getNavLinks(role);
  const isSiloed = (session.user as { isSiloed?: boolean }).isSiloed;
  const showToggle = role !== "SYSTEM_ADMIN" && !isSiloed;

  function toggleViewAll() {
    const next = !viewAll;
    document.cookie = `viewAllOffices=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setViewAll(next);
    router.refresh();
  }

  return (
    <nav className="bg-navy text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-8">
        <Link href="/" className="text-lg font-bold tracking-wide">
          JCRB Relationship Map
        </Link>
        <div className="flex gap-4 text-sm">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  isActive
                    ? "text-white font-semibold border-b-2 border-white pb-0.5"
                    : "text-blue-200 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          {showToggle && (
            <button
              onClick={toggleViewAll}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                viewAll
                  ? "bg-blue-200 text-navy"
                  : "bg-navy-light border border-blue-300 text-blue-200"
              }`}
            >
              {viewAll ? "All Offices" : "My Office"}
            </button>
          )}
          <Link
            href="/help"
            className="text-blue-200 hover:text-white transition-colors"
            title="Help"
          >
            ?
          </Link>
          <span>
            {session.user.name}{" "}
            <span className="text-blue-200 text-xs">({ROLE_LABELS[role] || role})</span>
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="hover:text-blue-200 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
