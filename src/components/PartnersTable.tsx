"use client";

import { useState } from "react";
import Link from "next/link";

interface Partner {
  id: string;
  organizationName: string | null;
  orgPeopleFlag: string;
  organizationType: { typeName: string } | null;
  city: string | null;
  state: string | null;
  priority: number | null;
  _count: { partnerRoles: number };
}

export default function PartnersTable({ partners }: { partners: Partner[] }) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? partners.filter((p) => {
        const q = search.toLowerCase();
        return (
          (p.organizationName?.toLowerCase().includes(q) ?? false) ||
          (p.organizationType?.typeName.toLowerCase().includes(q) ?? false) ||
          (p.city?.toLowerCase().includes(q) ?? false) ||
          (p.state?.toLowerCase().includes(q) ?? false)
        );
      })
    : partners;

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search partners..."
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent w-64"
        />
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-navy">Organization Name</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Type Flag</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Organization Type</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">City</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">State</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Priority</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Roles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((partner) => (
              <tr key={partner.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/partners/${partner.id}`}
                    className="text-[#2E75B6] hover:underline font-medium"
                  >
                    {partner.organizationName ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      partner.orgPeopleFlag === "O"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {partner.orgPeopleFlag === "O" ? "Org" : "Person"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {partner.organizationType?.typeName ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">{partner.city ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{partner.state ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{partner.priority ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{partner._count.partnerRoles}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {search ? "No partners match your search." : "No partners found. Add your first partner above."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
