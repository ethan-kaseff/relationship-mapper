"use client";

import { useState } from "react";
import Link from "next/link";
import ExportPartnersButton from "@/components/ExportPartnersButton";

interface PartnerRole {
  roleDescription: string;
  _count: { relationships: number };
}

interface Partner {
  id: string;
  organizationName: string | null;
  priority: number | null;
  organizationType: { typeName: string } | null;
  city: string | null;
  state: string | null;
  phoneNumber: string | null;
  email: string | null;
  partnerRoles: PartnerRole[];
}

const PRIORITY_OPTIONS = [
  { value: "", label: "All" },
  { value: "5", label: "Lowest & above" },
  { value: "4", label: "Low & above" },
  { value: "3", label: "Medium & above" },
  { value: "2", label: "High & above" },
  { value: "1", label: "Highest only" },
];

export default function PartnersWithoutRelationships({ partners }: { partners: Partner[] }) {
  const [maxPriority, setMaxPriority] = useState("");

  const filtered = maxPriority
    ? partners.filter((p) => p.priority !== null && p.priority <= parseInt(maxPriority))
    : partners;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-indigo-900">Partners Without Relationships</h2>
          <select
            value={maxPriority}
            onChange={(e) => setMaxPriority(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <ExportPartnersButton partners={filtered} />
      </div>
      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {maxPriority ? "No partners match this priority filter." : "All partners have at least one relationship."}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b text-gray-500">
              <th className="pb-2">Partner</th>
              <th className="pb-2">Priority</th>
              <th className="pb-2">Role(s)</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">City</th>
              <th className="pb-2">State</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2">
                  <Link href={`/partners/${p.id}`} className="text-indigo-600 hover:underline font-medium">
                    {p.organizationName || "—"}
                  </Link>
                </td>
                <td className="py-2 text-gray-600">{p.priority ?? "—"}</td>
                <td className="py-2 text-gray-600">
                  {(() => {
                    const rolesWithout = p.partnerRoles.filter((r) => r._count.relationships === 0);
                    return rolesWithout.length > 0
                      ? rolesWithout.map((r) => r.roleDescription).join(", ")
                      : "—";
                  })()}
                </td>
                <td className="py-2 text-gray-600">{p.organizationType?.typeName || "—"}</td>
                <td className="py-2 text-gray-600">{p.city || "—"}</td>
                <td className="py-2 text-gray-600">{p.state || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
