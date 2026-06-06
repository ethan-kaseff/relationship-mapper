"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Pagination, { usePagination } from "./Pagination";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  city: string | null;
  state: string | null;
  phoneNumber: string | null;
  email1: string | null;
  email2: string | null;
  isConnector: boolean;
  status: string;
  tagIds: string[];
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PROSPECT: "Prospect",
  INACTIVE: "Inactive",
  DECEASED: "Deceased",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PROSPECT: "bg-blue-100 text-blue-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  DECEASED: "bg-slate-100 text-slate-500",
};

type SortOption = "name" | "newest";

export default function PeopleTable({ people, onAdvancedSearch }: { people: Person[]; onAdvancedSearch: () => void }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name");

  useEffect(() => {
    setSearch(sessionStorage.getItem("people-search") ?? "");
  }, []);

  useEffect(() => {
    sessionStorage.setItem("people-search", search);
  }, [search]);

  const sorted = sort === "newest"
    ? [...people].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : people;

  const filtered = sorted.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      `${p.lastName}, ${p.firstName}`.toLowerCase().includes(q) ||
      (p.city?.toLowerCase().includes(q) ?? false) ||
      (p.state?.toLowerCase().includes(q) ?? false) ||
      (p.email1?.toLowerCase().includes(q) ?? false) ||
      (p.email2?.toLowerCase().includes(q) ?? false)
    );
  });

  const { currentPage, pageSize, startIndex, endIndex, setCurrentPage, setPageSize } =
    usePagination(filtered.length);

  const paginated = filtered.slice(startIndex, endIndex);

  function handleExport() {
    const rows = [
      ["First Name", "Last Name", "Email 1", "Email 2", "Phone", "City", "State", "Status"],
      ...filtered.map((p) => [
        p.firstName,
        p.lastName,
        p.email1 ?? "",
        p.email2 ?? "",
        p.phoneNumber ?? "",
        p.city ?? "",
        p.state ?? "",
        STATUS_LABELS[p.status] ?? p.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "people-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mb-4 flex gap-3 flex-wrap items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered.length === 1) {
              router.push(`/people/${filtered[0].id}`);
            }
          }}
          placeholder="Search people..."
          autoFocus
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
        />
        <button
          onClick={onAdvancedSearch}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Advanced Search
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="name">Sort: Name (A–Z)</option>
          <option value="newest">Sort: Newest First</option>
        </select>
        <button
          onClick={handleExport}
          className="ml-auto border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">City</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">State</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Email 1</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Email 2</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Connector</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map((person) => (
              <tr key={person.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/people/${person.id}`}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    {person.lastName}, {person.firstName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {person.status !== "ACTIVE" && (
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[person.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[person.status] ?? person.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{person.city ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{person.state ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{person.phoneNumber ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{person.email1 ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{person.email2 ?? "—"}</td>
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
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  {search ? "No people match your search." : "No people found. Add your first person above."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </>
  );
}
