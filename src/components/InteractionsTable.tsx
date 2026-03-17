"use client";

import Link from "next/link";
import Pagination, { usePagination } from "./Pagination";

interface Connection {
  id: string;
  connectionDate: string;
  notes: string | null;
  person: { id: string; firstName: string; lastName: string };
  partnerRole: {
    roleDescription: string;
    partner: { id: string; organizationName: string | null };
  };
}

export default function InteractionsTable({ connections }: { connections: Connection[] }) {
  const { currentPage, pageSize, startIndex, endIndex, setCurrentPage, setPageSize } =
    usePagination(connections.length);

  const paginated = connections.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Date</th>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Connector</th>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Partner</th>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Role</th>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginated.map((conn) => (
            <tr key={conn.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600">
                {new Date(conn.connectionDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/people/${conn.person.id}`}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  {conn.person.firstName} {conn.person.lastName}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/partners/${conn.partnerRole.partner.id}`}
                  className="text-indigo-600 hover:underline"
                >
                  {conn.partnerRole.partner.organizationName ?? "—"}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {conn.partnerRole.roleDescription}
              </td>
              <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                {conn.notes ?? "—"}
              </td>
            </tr>
          ))}
          {connections.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No interactions found. Add your first interaction above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Pagination
        currentPage={currentPage}
        totalItems={connections.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
