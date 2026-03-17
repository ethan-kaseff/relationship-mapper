import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";
import OfficeDataToggle from "@/components/OfficeDataToggle";
import EventsTable from "@/components/EventsTable";

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

  const serialized = events.map((event) => ({
    id: event.id,
    title: event.title,
    eventDate: event.eventDate?.toISOString() ?? null,
    location: event.location,
    inviteCount: event._count.invites,
    confirmedCount: event.invites.filter((i) => i.rsvpStatus === "YES").length,
  }));

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

      <EventsTable events={serialized} />
    </div>
  );
}
