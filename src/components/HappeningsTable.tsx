"use client";

import Link from "next/link";
import Pagination, { usePagination } from "./Pagination";

interface Happening {
  id: string;
  happeningDescription: string;
  happeningDate: string;
  _count: { responses: number };
}

export default function HappeningsTable({ happenings }: { happenings: Happening[] }) {
  const { currentPage, pageSize, startIndex, endIndex, setCurrentPage, setPageSize } =
    usePagination(happenings.length);

  const paginated = happenings.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Happening</th>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Responses</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginated.map((happening) => (
            <tr key={happening.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link
                  href={`/happenings/${happening.id}`}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  {happening.happeningDescription}
                </Link>
                <span className="text-gray-500 ml-2 text-xs">
                  {new Date(happening.happeningDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {happening._count.responses}
                </span>
              </td>
            </tr>
          ))}
          {happenings.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                No happenings found. Add your first one above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Pagination
        currentPage={currentPage}
        totalItems={happenings.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
