import Link from "next/link";
import { prisma } from "@/lib/prisma";
import OfficeDataToggle from "@/components/OfficeDataToggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    include: {
      _count: { select: { responses: true } },
    },
    orderBy: { eventDate: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-navy">Events</h1>
          <OfficeDataToggle />
        </div>
        <Link
          href="/events/new"
          className="bg-[#2E75B6] text-white px-4 py-2 rounded-md hover:bg-[#245d91] transition-colors"
        >
          Add Event
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-navy">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Time</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Description</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Responses</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">
                  {new Date(event.eventDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-gray-600">{event.eventTime ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/events/${event.id}`}
                    className="text-[#2E75B6] hover:underline font-medium"
                  >
                    {event.eventDescription}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {event._count.responses}
                  </span>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No events found. Add your first event above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
