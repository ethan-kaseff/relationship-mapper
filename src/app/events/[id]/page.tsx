import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      responses: {
        include: { person: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event) return notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">{event.eventDescription}</h1>
        <Link
          href="/events"
          className="text-[#2E75B6] hover:underline text-sm"
        >
          Back to Events
        </Link>
      </div>

      {/* Event Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Event Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-500">Date:</span>{" "}
            <span className="text-gray-800">
              {new Date(event.eventDate).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Time:</span>{" "}
            <span className="text-gray-800">{event.eventTime ?? "—"}</span>
          </div>
          <div className="md:col-span-2">
            <span className="font-medium text-gray-500">Description:</span>{" "}
            <span className="text-gray-800">{event.eventDescription}</span>
          </div>
        </div>
      </div>

      {/* Responses */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-navy mb-4">
          Responses ({event.responses.length})
        </h2>
        {event.responses.length === 0 ? (
          <p className="text-gray-400 text-sm">No responses recorded for this event.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-navy">Person</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Response Date</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Notes</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {event.responses.map((resp) => (
                <tr key={resp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/people/${resp.person.id}`}
                      className="text-[#2E75B6] hover:underline"
                    >
                      {resp.person.firstName} {resp.person.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {resp.responseDate
                      ? new Date(resp.responseDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{resp.responseNotes ?? "—"}</td>
                  <td className="px-4 py-2">
                    {resp.isPublic ? (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        Public
                      </span>
                    ) : (
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        Private
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
