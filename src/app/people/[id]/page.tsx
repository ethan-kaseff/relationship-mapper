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
import { formatCurrency } from "@/lib/currency";
import PersonNotesSection from "@/components/PersonNotesSection";
import PeopleStatusSection from "@/components/PeopleStatusSection";
import TagToggle from "@/components/TagToggle";
import MergePersonButton from "@/components/MergePersonButton";
import { isCrossOfficeView } from "@/lib/office-filter";
import AiBriefingButton from "@/components/AiBriefingButton";

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
              relationshipTypes: { include: { relationshipType: true } },
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
          relationshipTypes: { include: { relationshipType: true } },
        },
      },
      targetOfRelationships: {
        include: {
          person: true,
          partnerRole: { include: { partner: true } },
          relationshipTypes: { include: { relationshipType: true } },
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
        include: { event: { select: { id: true, title: true, eventDate: true, ticketPrice: true, mealCost: true } } },
        orderBy: { createdAt: "desc" },
      },
      tags: {
        include: { tag: true },
      },
      donations: {
        include: { fundraiser: { select: { id: true, title: true, eventId: true } } },
        orderBy: { donatedAt: "desc" },
      },
      personNotes: {
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
      },
      assignedTo: { select: { firstName: true, lastName: true } },
      emailTemplate: { select: { subject: true, body: true } },
      communicationMethod: { select: { id: true, name: true } },
    },
  });

  if (!person) return notFound();

  const allTags = await prisma.tag.findMany({
    where: { officeId: person.officeId },
    orderBy: { name: "asc" },
  });

  const [session, crossOffice] = await Promise.all([auth(), isCrossOfficeView()]);
  const userRole = session?.user?.role;
  const canEdit = userRole !== "CONNECTOR" && userRole !== "VIEWER" && !crossOffice;
  const canSeeDonations = userRole !== "VIEWER" && !crossOffice;

  // Relationships where this person is the target (others connecting to them)
  const targetRelationships = person.targetOfRelationships.map((rel) => ({
    id: rel.id,
    connectorName: `${rel.person.firstName} ${rel.person.lastName}`,
    connectorId: rel.person.id,
    partner: rel.partnerRole?.partner?.organizationName ?? "—",
    partnerId: rel.partnerRole?.partner?.id,
    role: rel.partnerRole?.roleDescription ?? "—",
    type: rel.relationshipTypes.map((rt) => rt.relationshipType.relationshipDesc).join(", "),
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
      <div className="flex items-start justify-between mb-0">
        <h1 className="text-2xl font-bold text-indigo-900">{person.firstName} {person.lastName}</h1>
        <div className="flex items-center gap-3 mt-1">
          <AiBriefingButton
            personId={person.id}
            personName={`${person.firstName} ${person.lastName}`}
          />
          <Link
            href="/people"
            className="text-indigo-600 hover:underline text-sm"
          >
            Back to People
          </Link>
        </div>
      </div>

      <PeopleStatusSection
        personId={person.id}
        personName={`${person.firstName} ${person.lastName}`}
        greeting={person.greeting ?? null}
        email={person.email1 ?? person.email2}
        status={person.status}
        deceasedDate={person.deceasedDate ? person.deceasedDate.toISOString() : null}
        forwardingEmail={person.forwardingEmail ?? null}
        assignedToId={person.assignedToId ?? null}
        assignedTo={person.assignedTo ?? null}
        assignedDate={person.assignedDate ? person.assignedDate.toISOString() : null}
        emailTemplateId={person.emailTemplateId ?? null}
        emailTemplate={person.emailTemplate ?? null}
        assignedToName={person.assignedTo ? `${person.assignedTo.firstName} ${person.assignedTo.lastName}` : null}
        createdAt={person.createdAt.toISOString()}
        canEdit={canEdit}
        personOfficeId={person.officeId}
      />

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
            listedAs: person.listedAs,
            address: person.address,
            city: person.city,
            state: person.state,
            zip: person.zip,
            phoneNumber: person.phoneNumber,
            email1: person.email1,
            email2: person.email2,
            isConnector: person.isConnector,
            tagIds: person.tags.map((t) => t.tag.id),
            communicationMethodId: person.communicationMethod?.id ?? null,
            communicationMethodName: person.communicationMethod?.name ?? null,
          }}
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
            {person.listedAs && (
              <div>
                <span className="font-medium text-gray-500">Listed As:</span>{" "}
                <span className="text-gray-800">{person.listedAs}</span>
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
          </div>
        </div>
      )}

      {/* Tags — inline for all roles, editable for canEdit */}
      {allTags.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-3">Tags</h2>
          <TagToggle
            entityId={person.id}
            entityType="person"
            initialTagIds={person.tags.map((t) => t.tag.id)}
            allTags={allTags}
            readOnly={!canEdit}
          />
          {!canEdit && person.tags.length === 0 && (
            <p className="text-sm text-gray-400">No tags assigned.</p>
          )}
        </div>
      )}

      {/* Notes */}
      {(canEdit || person.personNotes.length > 0) && (
        <PersonNotesSection
          personId={person.id}
          notes={person.personNotes.map((n) => ({
            id: n.id,
            content: n.content,
            createdAt: n.createdAt.toISOString(),
            author: n.author,
          }))}
          canEdit={canEdit}
        />
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
                  <td className="px-4 py-2 text-gray-600">{rel.relationshipTypes.map((rt) => rt.relationshipType.relationshipDesc).join(", ")}</td>
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
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Attended</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Donated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {person.eventInvites.map((invite) => {
                const donated = person.donations.some((d) => d.fundraiser?.eventId === invite.event.id);
                return (
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
                  <td className="px-4 py-2">
                    {invite.attended ? (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">Yes</span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {donated ? (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">Yes</span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Giving History — hidden from Viewer role */}
      {canSeeDonations && (() => {
        const ticketInvites = person.eventInvites.filter(
          (inv) => inv.event.ticketPrice && inv.event.ticketPrice > 0 && inv.rsvpStatus === "YES"
        );
        const donationTotal = person.donations.reduce((sum, d) => sum + d.amount, 0);
        const ticketTotal = ticketInvites.reduce((sum, inv) => sum + (inv.event.ticketPrice ?? 0), 0);
        const grandTotal = donationTotal + ticketTotal;
        const hasAnything = person.donations.length > 0 || ticketInvites.length > 0;

        // Tax-deductible totals
        const donationDeductibleTotal = person.donations.reduce((sum, d) => {
          return sum + (d.taxDeductibleAmount ?? d.amount);
        }, 0);
        const ticketDeductibleTotal = ticketInvites.reduce((sum, inv) => {
          const override = inv.taxDeductibleOverride;
          if (override != null) return sum + override;
          const ticket = inv.event.ticketPrice ?? 0;
          const meal = inv.event.mealCost ?? 0;
          return sum + Math.max(0, ticket - meal);
        }, 0);
        const grandDeductibleTotal = donationDeductibleTotal + ticketDeductibleTotal;

        return (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-indigo-900 mb-4">Giving History</h2>
            {!hasAnything ? (
              <p className="text-gray-400 text-sm">No donations or event payments recorded.</p>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Total: <span className="font-medium text-gray-900">{formatCurrency(grandTotal)}</span>
                  {person.donations.length > 0 && ticketInvites.length > 0 && (
                    <span className="text-gray-400 ml-2">
                      ({formatCurrency(donationTotal)} donations + {formatCurrency(ticketTotal)} event tickets)
                    </span>
                  )}
                  <br />
                  Tax-Deductible Total: <span className="font-medium text-gray-900">{formatCurrency(grandDeductibleTotal)}</span>
                </div>

                {/* Donations */}
                {person.donations.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Donations</h3>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-2 font-semibold text-indigo-900">Fundraiser</th>
                          <th className="text-left px-4 py-2 font-semibold text-indigo-900">Amount</th>
                          <th className="text-left px-4 py-2 font-semibold text-indigo-900">Tax-Deductible</th>
                          <th className="text-left px-4 py-2 font-semibold text-indigo-900">Method</th>
                          <th className="text-left px-4 py-2 font-semibold text-indigo-900">Date</th>
                          <th className="text-left px-4 py-2 font-semibold text-indigo-900">Tribute</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {person.donations.map((donation) => (
                          <tr key={donation.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <Link
                                href={`/fundraisers/${donation.fundraiser.id}`}
                                className="text-indigo-600 hover:underline"
                              >
                                {donation.fundraiser.title}
                              </Link>
                            </td>
                            <td className="px-4 py-2 font-medium">{formatCurrency(donation.amount)}</td>
                            <td className="px-4 py-2 text-gray-600">
                              {formatCurrency(donation.taxDeductibleAmount ?? donation.amount)}
                            </td>
                            <td className="px-4 py-2 capitalize text-gray-600">{donation.paymentMethod}</td>
                            <td className="px-4 py-2 text-gray-600">
                              {new Date(donation.donatedAt).toLocaleDateString(undefined, { timeZone: "UTC" })}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {donation.tributeType ? (
                                <span className="text-xs">
                                  {donation.tributeType === "in_honor_of" ? "In honor of" : "In memory of"}{" "}
                                  {donation.tributeName}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Event Tickets */}
                {ticketInvites.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Event Tickets</h3>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-2 font-semibold text-indigo-900">Event</th>
                          <th className="text-left px-4 py-2 font-semibold text-indigo-900">Ticket Price</th>
                          <th className="text-left px-4 py-2 font-semibold text-indigo-900">Tax-Deductible</th>
                          <th className="text-left px-4 py-2 font-semibold text-indigo-900">Event Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ticketInvites.map((invite) => {
                          const ticketDeductible = invite.taxDeductibleOverride != null
                            ? invite.taxDeductibleOverride
                            : Math.max(0, (invite.event.ticketPrice ?? 0) - (invite.event.mealCost ?? 0));
                          return (
                            <tr key={invite.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <Link
                                  href={`/events/${invite.event.id}`}
                                  className="text-indigo-600 hover:underline"
                                >
                                  {invite.event.title}
                                </Link>
                              </td>
                              <td className="px-4 py-2 font-medium">
                                {formatCurrency(invite.event.ticketPrice!)}
                              </td>
                              <td className="px-4 py-2 text-gray-600">
                                {formatCurrency(ticketDeductible)}
                                {invite.event.mealCost != null && invite.event.mealCost > 0 && invite.taxDeductibleOverride == null && (
                                  <span className="text-xs text-gray-400 ml-1">
                                    ({formatCurrency(invite.event.ticketPrice!)} − {formatCurrency(invite.event.mealCost)} meal)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-gray-600">
                                {invite.event.eventDate
                                  ? new Date(invite.event.eventDate).toLocaleDateString(undefined, { timeZone: "UTC" })
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

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

      {/* Merge / Delete */}
      {canEdit && (
        <div className="border-t border-gray-200 pt-6 mt-6 flex justify-end gap-3">
          <MergePersonButton person={{
            id: person.id,
            firstName: person.firstName,
            middleInitial: person.middleInitial ?? null,
            lastName: person.lastName,
            prefix: person.prefix ?? null,
            greeting: person.greeting ?? null,
            address: person.address ?? null,
            city: person.city ?? null,
            state: person.state ?? null,
            zip: person.zip ?? null,
            phoneNumber: person.phoneNumber ?? null,
            email1: person.email1 ?? null,
            email2: person.email2 ?? null,
            status: person.status,
            isConnector: person.isConnector,
          }} />
          <DeletePersonButton personId={person.id} />
        </div>
      )}
    </div>
  );
}
