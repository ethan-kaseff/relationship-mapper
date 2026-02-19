import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import AddRelationshipForm from "@/components/AddRelationshipForm";
import DeletePersonButton from "@/components/DeletePersonButton";
import EditPersonButton from "@/components/EditPersonName";

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
        include: {
          partner: true,
          relationships: {
            include: {
              person: true,
              relationshipType: true,
            },
          },
          connections: {
            include: { person: true },
            orderBy: { connectionDate: "desc" },
          },
        },
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

  const session = await auth();
  const canEdit = session?.user?.role !== "CONNECTOR";

  // Relationships via this person's partner roles (where they are the target)
  const roleRelationships = person.partnerRoles.flatMap((pr) =>
    pr.relationships.map((rel) => ({
      id: rel.id,
      connectorName: `${rel.person.firstName} ${rel.person.lastName}`,
      connectorId: rel.person.id,
      partner: pr.partner.organizationName ?? "—",
      partnerId: pr.partner.id,
      role: pr.roleDescription,
      type: rel.relationshipType.relationshipDesc,
      lastReviewed: rel.lastReviewedDate,
    }))
  );

  // Interactions via this person's partner roles
  const roleConnections = person.partnerRoles.flatMap((pr) =>
    pr.connections.map((conn) => ({
      id: conn.id,
      connectorName: `${conn.person.firstName} ${conn.person.lastName}`,
      connectorId: conn.person.id,
      partner: pr.partner.organizationName ?? "—",
      partnerId: pr.partner.id,
      role: pr.roleDescription,
      date: conn.connectionDate,
      notes: conn.notes,
    }))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">{person.firstName} {person.lastName}</h1>
        <div className="flex items-center gap-4">
          <DeletePersonButton personId={person.id} />
          <Link
            href="/people"
            className="text-[#2E75B6] hover:underline text-sm"
          >
            Back to People
          </Link>
        </div>
      </div>

      {/* Contact Info — editable for non-Connector roles */}
      {canEdit ? (
        <EditPersonButton
          personId={person.id}
          person={{
            firstName: person.firstName,
            lastName: person.lastName,
            address: person.address,
            city: person.city,
            state: person.state,
            zip: person.zip,
            phoneNumber: person.phoneNumber,
            personalEmail: person.personalEmail,
            isConnector: person.isConnector,
          }}
        />
      ) : (
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
      )}

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

      {/* Relationships (as connector) */}
      {person.relationships.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy">Relationships (as Connector)</h2>
            <AddRelationshipForm personId={person.id} />
          </div>
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
        </div>
      )}

      {/* Relationships (via partner role — others connecting to this person) */}
      {roleRelationships.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-4">Relationships (via Partner Role)</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-navy">Connector</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Partner</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Role</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Type</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Last Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roleRelationships.map((rel) => (
                <tr key={rel.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/people/${rel.connectorId}`} className="text-[#2E75B6] hover:underline">
                      {rel.connectorName}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/partners/${rel.partnerId}`} className="text-[#2E75B6] hover:underline">
                      {rel.partner}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{rel.role}</td>
                  <td className="px-4 py-2 text-gray-600">{rel.type}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {rel.lastReviewed ? new Date(rel.lastReviewed).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No relationships at all */}
      {person.relationships.length === 0 && roleRelationships.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy">Relationships</h2>
            <AddRelationshipForm personId={person.id} />
          </div>
          <p className="text-gray-400 text-sm">No relationships recorded.</p>
        </div>
      )}

      {/* Interactions (as connector) */}
      {person.connections.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-4">Interactions (as Connector)</h2>
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
        </div>
      )}

      {/* Interactions (via partner role) */}
      {roleConnections.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-4">Interactions (via Partner Role)</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-navy">Date</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Connector</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Partner</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Role</th>
                <th className="text-left px-4 py-2 font-semibold text-navy">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roleConnections.map((conn) => (
                <tr key={conn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(conn.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/people/${conn.connectorId}`} className="text-[#2E75B6] hover:underline">
                      {conn.connectorName}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/partners/${conn.partnerId}`} className="text-[#2E75B6] hover:underline">
                      {conn.partner}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{conn.role}</td>
                  <td className="px-4 py-2 text-gray-600">{conn.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No interactions at all */}
      {person.connections.length === 0 && roleConnections.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-4">Interactions</h2>
          <p className="text-gray-400 text-sm">No interactions recorded.</p>
        </div>
      )}

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
