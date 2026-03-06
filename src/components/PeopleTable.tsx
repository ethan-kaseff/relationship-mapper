"use client";

import { useState } from "react";
import Link from "next/link";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  city: string | null;
  state: string | null;
  phoneNumber: string | null;
  personalEmail: string | null;
  isConnector: boolean;
}

export default function PeopleTable({ people }: { people: Person[] }) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? people.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          `${p.lastName}, ${p.firstName}`.toLowerCase().includes(q) ||
          (p.city?.toLowerCase().includes(q) ?? false) ||
          (p.state?.toLowerCase().includes(q) ?? false) ||
          (p.personalEmail?.toLowerCase().includes(q) ?? false)
        );
      })
    : people;

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
        />
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">City</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">State</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Connector</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((person) => (
              <tr key={person.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/people/${person.id}`}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    {person.lastName}, {person.firstName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{person.city ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{person.state ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{person.phoneNumber ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{person.personalEmail ?? "—"}</td>
                <td className="px-4 py-3">
                  {person.isConnector && (
                    <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      Connector
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {search ? "No people match your search." : "No people found. Add your first person above."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
