"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

const allNavLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/people", label: "People" },
  { href: "/partners", label: "Partners" },
  { href: "/relationships", label: "Relationships" },
  { href: "/interactions", label: "Interactions" },
  { href: "/events", label: "Events" },
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

  if (pathname === "/login" || status !== "authenticated") return null;

  const role = session.user.role;
  const navLinks = getNavLinks(role);

  return (
    <nav className="bg-navy text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-8">
        <Link href="/" className="text-lg font-bold tracking-wide">
          JCRB Relationship Map
        </Link>
        <div className="flex gap-4 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-blue-200 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
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
