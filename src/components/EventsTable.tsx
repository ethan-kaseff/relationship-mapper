"use client";

import Link from "next/link";
import Pagination, { usePagination } from "./Pagination";

interface Event {
  id: string;
  title: string;
  eventDate: string | null;
  location: string | null;
  inviteCount: number;
  confirmedCount: number;
}

export default function EventsTable({ events }: { events: Event[] }) {
  const { currentPage, pageSize, startIndex, endIndex, setCurrentPage, setPageSize } =
    usePagination(events.length);

  const paginated = events.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Title</th>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Date</th>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Location</th>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Invited</th>
            <th className="text-left px-4 py-3 font-semibold text-indigo-900">Confirmed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginated.map((event) => (
            <tr key={event.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link
                  href={`/events/${event.id}`}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  {event.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {event.eventDate
                  ? new Date(event.eventDate).toLocaleDateString(undefined, { timeZone: "UTC" })
                  : "—"}
              </td>
              <td className="px-4 py-3 text-gray-600">{event.location ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {event.inviteCount}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-block bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {event.confirmedCount}
                </span>
              </td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No events yet. Create your first one above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Pagination
        currentPage={currentPage}
        totalItems={events.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
