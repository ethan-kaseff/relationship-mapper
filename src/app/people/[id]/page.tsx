import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import AddRelationshipForm from "@/components/AddRelationshipForm";
import DeletePersonButton from "@/components/DeletePersonButton";
import EditPersonButton from "@/components/EditPersonName";
import RemoveRolePersonButton from "@/components/RemoveRolePersonButton";
import ConnectorLinkSection from "@/components/ConnectorLinkSection";
import AddHappeningResponseForm from "@/components/AddHappeningResponseForm";
import HappeningResponseRow from "@/components/HappeningResponseRow";

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
      roleAssignments: {
        include: {
          partnerRole: { include: { partner: true } },
        },
        orderBy: { createdAt: "desc" },
      },
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
          targetPerson: true,
          partnerRole: { include: { partner: true } },
          relationshipType: true,
        },
      },
      targetOfRelationships: {
        include: {
          person: true,
          partnerRole: { include: { partner: true } },
          relationshipType: true,
        },
      },
      connections: {
        include: {
          partnerRole: { include: { partner: true, person: true } },
        },
        orderBy: { connectionDate: "desc" },
      },
      happeningResponses: {
        include: { happening: true },
        orderBy: { createdAt: "desc" },
      },
      eventInvites: {
        include: { event: true },
        orderBy: { createdAt: "desc" },
      },
      annualEventTypes: {
        include: { annualEventType: true },
      },
    },
  });

  if (!person) return notFound();

  const allAnnualEventTypes = await prisma.annualEventType.findMany({
    where: { officeId: person.officeId },
    orderBy: { name: "asc" },
  });

  const session = await auth();
  const userRole = session?.user?.role;
  const canEdit = userRole !== "CONNECTOR" && userRole !== "VIEWER";

  // Relationships where this person is the target (others connecting to them)
  const targetRelationships = person.targetOfRelationships.map((rel) => ({
    id: rel.id,
    connectorName: `${rel.person.firstName} ${rel.person.lastName}`,
    connectorId: rel.person.id,
    partner: rel.partnerRole?.partner?.organizationName ?? "—",
    partnerId: rel.partnerRole?.partner?.id,
    role: rel.partnerRole?.roleDescription ?? "—",
    type: rel.relationshipType.relationshipDesc,
    lastReviewed: rel.lastReviewedDate,
    hasPartnerRole: !!rel.partnerRole,
  }));

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
        <h1 className="text-2xl font-bold text-indigo-900">{person.firstName} {person.lastName}</h1>
        <Link
          href="/people"
          className="text-indigo-600 hover:underline text-sm"
        >
          Back to People
        </Link>
      </div>

      {/* Contact Info — editable for non-Connector roles */}
      {canEdit ? (
        <EditPersonButton
          personId={person.id}
          person={{
            firstName: person.firstName,
            middleInitial: person.middleInitial,
            lastName: person.lastName,
            prefix: person.prefix,
            greeting: person.greeting,
            address: person.address,
            city: person.city,
            state: person.state,
            zip: person.zip,
            phoneNumber: person.phoneNumber,
            email1: person.email1,
            email2: person.email2,
            isConnector: person.isConnector,
            annualEventTypeIds: person.annualEventTypes.map((a) => a.annualEventType.id),
          }}
          allAnnualEventTypes={allAnnualEventTypes}
        />
      ) : (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
            {person.prefix && (
              <div>
                <span className="font-medium text-gray-500">Prefix:</span>{" "}
                <span className="text-gray-800">{person.prefix}</span>
              </div>
            )}
            {person.greeting && (
              <div>
                <span className="font-medium text-gray-500">Greeting:</span>{" "}
                <span className="text-gray-800">{person.greeting}</span>
              </div>
            )}
            {person.phoneNumber && (
              <div>
                <span className="font-medium text-gray-500">Phone:</span>{" "}
                <span className="text-gray-800">{person.phoneNumber}</span>
              </div>
            )}
            {person.email1 && (
              <div>
                <span className="font-medium text-gray-500">Email 1:</span>{" "}
                <span className="text-gray-800">{person.email1}</span>
              </div>
            )}
            {person.email2 && (
              <div>
                <span className="font-medium text-gray-500">Email 2:</span>{" "}
                <span className="text-gray-800">{person.email2}</span>
              </div>
            )}
            {(person.address || person.city || person.state || person.zip) && (
              <div className="md:col-span-2">
                <span className="font-medium text-gray-500">Address:</span>{" "}
                <span className="text-gray-800">
                  {[person.address, [person.city, person.state].filter(Boolean).join(", "), person.zip].filter(Boolean).join(" ")}
                </span>
              </div>
            )}
            {person.isConnector && (
              <div>
                <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  Connector
                </span>
              </div>
            )}
            {person.annualEventTypes.length > 0 && (
              <div className="md:col-span-2">
                <span className="font-medium text-gray-500">Annual Events:</span>{" "}
                <span className="text-gray-800">
                  {person.annualEventTypes.map((a) => a.annualEventType.name).join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Partner Roles */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-indigo-900 mb-4">Partner Roles</h2>
        {person.partnerRoles.length === 0 ? (
          <p className="text-gray-400 text-sm">No partner roles assigned.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Partner</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Role</th>
                {canEdit && (
                  <th className="text-right px-4 py-2 font-semibold text-indigo-900">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {person.partnerRoles.map((pr) => (
                <tr key={pr.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/partners/${pr.partner.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {pr.partner.organizationName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{pr.roleDescription}</td>
                  {canEdit && (
                    <td className="px-4 py-2 text-right">
                      <RemoveRolePersonButton
                        roleId={pr.id}
                        personName={`${person.firstName} ${person.lastName}`}
                        personId={person.id}
                        personOfficeId={person.officeId}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Role Assignment History */}
      {person.roleAssignments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">Role Assignment History</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Partner</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Role</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Start Date</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">End Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {person.roleAssignments.map((ra) => (
                <tr key={ra.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/partners/${ra.partnerRole.partner.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {ra.partnerRole.partner.organizationName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{ra.partnerRole.roleDescription}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {ra.startDate ? new Date(ra.startDate).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {ra.endDate ? new Date(ra.endDate).toLocaleDateString(undefined, { timeZone: "UTC" }) : "Current"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Relationships (as connector) */}
      {person.relationships.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-indigo-900">Relationships (as Connector)</h2>
            {canEdit && <AddRelationshipForm personId={person.id} />}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Person</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Partner / Role</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Type</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Last Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {person.relationships.map((rel) => (
                <tr key={rel.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/people/${rel.targetPerson.id}`}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      {rel.targetPerson.firstName} {rel.targetPerson.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {rel.partnerRole ? (
                      <Link
                        href={`/partners/${rel.partnerRole.partner.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {rel.partnerRole.partner.organizationName ?? "—"} — {rel.partnerRole.roleDescription}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{rel.relationshipType.relationshipDesc}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {rel.lastReviewedDate
                      ? new Date(rel.lastReviewedDate).toLocaleDateString(undefined, { timeZone: "UTC" })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Relationships where others connect to this person */}
      {targetRelationships.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">Relationships (Others Connecting to Me)</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Connector</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Partner / Role</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Type</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Last Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {targetRelationships.map((rel) => (
                <tr key={rel.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/people/${rel.connectorId}`} className="text-indigo-600 hover:underline font-medium">
                      {rel.connectorName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {rel.hasPartnerRole && rel.partnerId ? (
                      <Link href={`/partners/${rel.partnerId}`} className="text-indigo-600 hover:underline">
                        {rel.partner} — {rel.role}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{rel.type}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {rel.lastReviewed ? new Date(rel.lastReviewed).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No relationships at all */}
      {person.relationships.length === 0 && targetRelationships.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-indigo-900">Relationships</h2>
            {canEdit && <AddRelationshipForm personId={person.id} />}
          </div>
          <p className="text-gray-400 text-sm">No relationships recorded.</p>
        </div>
      )}

      {/* Interactions (as connector) */}
      {person.isConnector && person.connections.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">Interactions (as Connector)</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Date</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Person</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Partner</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Role</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {person.connections.map((conn) => (
                <tr key={conn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(conn.connectionDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
                  </td>
                  <td className="px-4 py-2">
                    {conn.partnerRole.person ? (
                      <Link href={`/people/${conn.partnerRole.person.id}`} className="text-indigo-600 hover:underline">
                        {conn.partnerRole.person.firstName} {conn.partnerRole.person.lastName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/partners/${conn.partnerRole.partner.id}`}
                      className="text-indigo-600 hover:underline"
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
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">Interactions (via Partner Role)</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Date</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Connector</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Partner</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Role</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roleConnections.map((conn) => (
                <tr key={conn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(conn.date).toLocaleDateString(undefined, { timeZone: "UTC" })}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/people/${conn.connectorId}`} className="text-indigo-600 hover:underline">
                      {conn.connectorName}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/partners/${conn.partnerId}`} className="text-indigo-600 hover:underline">
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
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">Interactions</h2>
          <p className="text-gray-400 text-sm">No interactions recorded.</p>
        </div>
      )}

      {/* Event Invites */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-indigo-900 mb-4">Event Invites</h2>
        {person.eventInvites.length === 0 ? (
          <p className="text-gray-400 text-sm">Not invited to any events.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Event</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Date</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">RSVP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {person.eventInvites.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/events/${invite.event.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {invite.event.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {invite.event.eventDate
                      ? new Date(invite.event.eventDate).toLocaleDateString(undefined, { timeZone: "UTC" })
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        invite.rsvpStatus === "YES"
                          ? "bg-green-100 text-green-800"
                          : invite.rsvpStatus === "NO"
                          ? "bg-red-100 text-red-800"
                          : invite.rsvpStatus === "MAYBE"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {invite.rsvpStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Happening Responses */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-indigo-900">Responses</h2>
          {canEdit && <AddHappeningResponseForm personId={person.id} />}
        </div>
        {person.happeningResponses.length === 0 ? (
          <p className="text-gray-400 text-sm">No responses recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Happening</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Date</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Notes</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Public</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {person.happeningResponses.map((er) => (
                <HappeningResponseRow
                  key={er.id}
                  response={{
                    id: er.id,
                    responseDate: er.responseDate?.toISOString() ?? null,
                    responseTime: er.responseTime,
                    responseNotes: er.responseNotes,
                    isPublic: er.isPublic,
                    platform: er.platform,
                    platformLink: er.platformLink,
                    happening: {
                      id: er.happening.id,
                      happeningDescription: er.happening.happeningDescription,
                      happeningDate: er.happening.happeningDate.toISOString(),
                    },
                  }}
                  mode="person"
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Connector Link — admin only, connectors only */}
      {person.isConnector && canEdit && (
        <ConnectorLinkSection
          personId={person.id}
          initialToken={person.connectorToken}
        />
      )}

      {/* Delete */}
      {canEdit && (
        <div className="border-t border-gray-200 pt-6 mt-6">
          <DeletePersonButton personId={person.id} />
        </div>
      )}
    </div>
  );
}
