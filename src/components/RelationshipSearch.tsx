"use client";

import { useState } from "react";
import Link from "next/link";

interface Relationship {
  id: string;
  person: { id: string; firstName: string; lastName: string };
  targetPerson: { id: string; firstName: string; lastName: string };
  partnerRole: {
    roleDescription: string;
    partner: { id: string; organizationName: string | null };
  } | null;
  relationshipType: { relationshipDesc: string };
  lastReviewedDate: string | null;
}

export default function RelationshipSearch({
  relationships,
}: {
  relationships: Relationship[];
}) {
  const [search, setSearch] = useState("");

  const query = search.toLowerCase().trim();
  const filtered = query
    ? relationships.filter((rel) => {
        const connector = `${rel.person.firstName} ${rel.person.lastName}`.toLowerCase();
        const person = `${rel.targetPerson.firstName} ${rel.targetPerson.lastName}`.toLowerCase();
        return connector.includes(query) || person.includes(query);
      })
    : relationships;

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by connector or person name..."
          className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Connector</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Person</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Partner / Role</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Relationship Type</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Last Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((rel) => (
              <tr key={rel.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/people/${rel.person.id}`}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    {rel.person.firstName} {rel.person.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/people/${rel.targetPerson.id}`}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    {rel.targetPerson.firstName} {rel.targetPerson.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {rel.partnerRole ? (
                    <Link
                      href={`/partners/${rel.partnerRole.partner.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {rel.partnerRole.partner.organizationName ?? "—"} — {rel.partnerRole.roleDescription}
                    </Link>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {rel.relationshipType.relationshipDesc}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {rel.lastReviewedDate
                    ? new Date(rel.lastReviewedDate).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  {search ? "No relationships match your search." : "No relationships found. Add your first relationship above."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
