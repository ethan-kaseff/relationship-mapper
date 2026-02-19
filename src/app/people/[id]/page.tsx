import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AddRelationshipForm from "@/components/AddRelationshipForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const person = await prisma.people.findUnique({
    where: { id },
    include: {
      partnerRoles: {
        include: { partner: true },
      },
      relationships: {
        include: {
          partnerRole: { include: { partner: true } },
          relationshipType: true,
        },
      },
      connections: {
        include: {
          partnerRole: { include: { partner: true } },
        },
        orderBy: { connectionDate: "desc" },
      },
      eventResponses: {
        include: { event: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!person) return notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">{person.fullName}</h1>
        <Link
          href="/people"
          className="text-[#2E75B6] hover:underline text-sm"
        >
          Back to People
        </Link>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-500">Address:</span>{" "}
            <span className="text-gray-800">{person.address ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">City:</span>{" "}
            <span className="text-gray-800">{person.city ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">State:</span>{" "}
            <span className="text-gray-800">{person.state ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Zip:</span>{" "}
            <span className="text-gray-800">{person.zip ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Phone:</span>{" "}
            <span className="text-gray-800">{person.phoneNumber ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Email:</span>{" "}
            <span className="text-gray-800">{person.personalEmail ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Connector:</span>{" "}
            {person.isConnector ? (
              <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                Yes
              </span>
            ) : (
              <span className="text-gray-800">No</span>
            )}
          </div>
        </div>
      </div>

      {/* Partner Roles */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Partner Roles</h2>
        {person.partnerRoles.length === 0 ? (
          <p className="text-gray-400 text-sm">No partner roles assigned.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-navy">Partner</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {person.partnerRoles.map((pr) => (
                <tr key={pr.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/partners/${pr.partner.id}`}
                      className="text-[#2E75B6] hover:underline"
                    >
                      {pr.partner.organizationName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{pr.roleDescription}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Relationships */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy">Relationships</h2>
          <AddRelationshipForm personId={person.id} />
        </div>
        {person.relationships.length === 0 ? (
          <p className="text-gray-400 text-sm">No relationships recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-navy">Partner</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Role</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Type</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Last Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {person.relationships.map((rel) => (
                <tr key={rel.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/partners/${rel.partnerRole.partner.id}`}
                      className="text-[#2E75B6] hover:underline"
                    >
                      {rel.partnerRole.partner.organizationName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{rel.partnerRole.roleDescription}</td>
                  <td className="px-4 py-2 text-gray-600">{rel.relationshipType.relationshipDesc}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {rel.lastReviewedDate
                      ? new Date(rel.lastReviewedDate).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Interactions */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Interactions</h2>
        {person.connections.length === 0 ? (
          <p className="text-gray-400 text-sm">No interactions recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-navy">Date</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Partner</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Role</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {person.connections.map((conn) => (
                <tr key={conn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(conn.connectionDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/partners/${conn.partnerRole.partner.id}`}
                      className="text-[#2E75B6] hover:underline"
                    >
                      {conn.partnerRole.partner.organizationName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{conn.partnerRole.roleDescription}</td>
                  <td className="px-4 py-2 text-gray-600">{conn.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Event Responses */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Event Responses</h2>
        {person.eventResponses.length === 0 ? (
          <p className="text-gray-400 text-sm">No event responses recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-navy">Event</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Date</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Notes</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Public</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {person.eventResponses.map((er) => (
                <tr key={er.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/events/${er.event.id}`}
                      className="text-[#2E75B6] hover:underline"
                    >
                      {er.event.eventDescription}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {er.responseDate
                      ? new Date(er.responseDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{er.responseNotes ?? "—"}</td>
                  <td className="px-4 py-2">
                    {er.isPublic ? (
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
