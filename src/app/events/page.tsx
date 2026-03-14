import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";
import OfficeDataToggle from "@/components/OfficeDataToggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EventsPage() {
  const officeFilter = await getOfficeFilter();
  const events = await prisma.event.findMany({
    where: officeFilter,
    include: {
      _count: { select: { invites: true } },
      invites: { select: { rsvpStatus: true } },
    },
    orderBy: { eventDate: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-indigo-900">Events</h1>
          <OfficeDataToggle />
        </div>
        <Link
          href="/events/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          New Event
        </Link>
      </div>

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
            {events.map((event) => {
              const yesCount = event.invites.filter((i) => i.rsvpStatus === "YES").length;
              return (
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
                      {event._count.invites}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {yesCount}
                    </span>
                  </td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No events yet. Create your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
