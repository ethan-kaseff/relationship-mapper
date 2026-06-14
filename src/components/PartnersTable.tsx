"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Pagination, { usePagination } from "./Pagination";

interface Partner {
  id: string;
  organizationName: string | null;
  orgPeopleFlag: string;
  organizationType: { typeName: string } | null;
  city: string | null;
  state: string | null;
  priority: number | null;
  status: string;
  _count: { partnerRoles: number };
}

export default function PartnersTable({ partners }: { partners: Partner[] }) {
  const router = useRouter();
  const [search, setSearch] = useState(() =>
    typeof window !== "undefined" ? (sessionStorage.getItem("partners-search") ?? "") : ""
  );
  const [showInactive, setShowInactive] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    sessionStorage.setItem("partners-search", search);
  }, [search]);

  const filtered = partners.filter((p) => {
    if (!showInactive && p.status === "INACTIVE") return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.organizationName?.toLowerCase().includes(q) ?? false) ||
      (p.organizationType?.typeName.toLowerCase().includes(q) ?? false) ||
      (p.city?.toLowerCase().includes(q) ?? false) ||
      (p.state?.toLowerCase().includes(q) ?? false)
    );
  });

  const { currentPage, pageSize, startIndex, endIndex, setCurrentPage, setPageSize } =
    usePagination(filtered.length);

  const paginated = filtered.slice(startIndex, endIndex);

  // Clear the keyboard highlight whenever the visible rows change
  useEffect(() => { setHighlightedIndex(-1); }, [search, showInactive, currentPage]);

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightedIndex((i) => Math.min(i + 1, paginated.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightedIndex((i) => Math.max(i - 1, -1));
            } else if (e.key === "Enter") {
              if (highlightedIndex >= 0 && highlightedIndex < paginated.length) {
                router.push(`/partners/${paginated[highlightedIndex].id}`);
              } else if (filtered.length === 1) {
                router.push(`/partners/${filtered[0].id}`);
              }
            }
          }}
          placeholder="Search partners..."
          autoFocus
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Show Inactive
        </label>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Organization Name</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Type Flag</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Organization Type</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">City</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">State</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Priority</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Roles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map((partner, idx) => (
              <tr key={partner.id} className={idx === highlightedIndex ? "bg-indigo-100" : "hover:bg-gray-50"}>
                <td className="px-4 py-3">
                  <Link
                    href={`/partners/${partner.id}`}
                    className="text-indigo-600 hover:underline font-medium"
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
                <td className="px-4 py-3">
                  {partner.status === "INACTIVE" ? (
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                  ) : (
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{partner._count.partnerRoles}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  {search ? "No partners match your search." : "No partners found. Add your first partner above."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
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
