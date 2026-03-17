"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <span>Show</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>per page</span>
      </div>

      <div className="flex items-center gap-3">
        <span>
          {start}–{end} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook to manage pagination state. Resets to page 1 when items change. */
export function usePagination(totalItems: number, defaultPageSize = 25) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Reset to page 1 when the total changes (e.g. after a search)
  useEffect(() => {
    setCurrentPage(1);
  }, [totalItems]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    currentPage,
    pageSize,
    startIndex,
    endIndex,
    setCurrentPage,
    setPageSize,
  };
}
