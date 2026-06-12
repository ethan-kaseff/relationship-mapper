import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import AddRoleForm from "@/components/AddRoleForm";
import DeletePartnerButton from "@/components/DeletePartnerButton";
import EditPartnerInfo from "@/components/EditPartnerInfo";
import RemoveRolePersonButton from "@/components/RemoveRolePersonButton";
import AssignRolePersonButton from "@/components/AssignRolePersonButton";
import DeleteRoleButton from "@/components/DeleteRoleButton";
import TagToggle from "@/components/TagToggle";
import { isCrossOfficeView } from "@/lib/office-filter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const partner = await prisma.partner.findUnique({
    where: { id },
    include: {
      organizationType: true,
      tags: {
        include: { tag: true },
      },
      partnerRoles: {
        orderBy: { roleDescription: "asc" },
        include: {
          person: true,
          roleAssignments: {
            include: { person: true },
            orderBy: { createdAt: "desc" },
          },
          relationships: {
            include: {
              person: true,
              targetPerson: true,
              relationshipTypes: { include: { relationshipType: true } },
            },
          },
          tags: {
            include: { tag: true },
          },
        },
      },
    },
  });

  if (!partner) return notFound();

  const [session, allTags, crossOffice] = await Promise.all([
    auth(),
    prisma.tag.findMany({ where: { officeId: partner.officeId }, orderBy: { name: "asc" } }),
    isCrossOfficeView(),
  ]);

  const userRole = session?.user?.role;
  const canEdit = userRole !== "CONNECTOR" && userRole !== "VIEWER" && !crossOffice;

  const partnerTagIds = partner.tags.map((t) => t.tag.id);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">
            {partner.organizationName ?? "Partner Detail"}
          </h1>
          {partner.status === "INACTIVE" && (
            <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Inactive
            </span>
          )}
        </div>
        <Link
          href="/partners"
          className="text-indigo-600 hover:underline text-sm mt-1"
        >
          Back to Partners
        </Link>
      </div>

      {/* Basic Info */}
      <EditPartnerInfo
        partnerId={partner.id}
        partner={{
          orgPeopleFlag: partner.orgPeopleFlag,
          organizationName: partner.organizationName,
          listedAs: partner.listedAs,
          organizationTypeId: partner.organizationTypeId,
          organizationType: partner.organizationType,
          address: partner.address,
          city: partner.city,
          state: partner.state,
          zip: partner.zip,
          phoneNumber: partner.phoneNumber,
          email: partner.email,
          website: partner.website,
          priority: partner.priority,
          status: partner.status,
        }}
        tagIds={partner.orgPeopleFlag === "P" ? partnerTagIds : undefined}
        allTags={allTags}
        readOnly={!canEdit}
      />

      {/* Roles & Relationships — only for Organizations */}
      {partner.orgPeopleFlag === "O" && <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-indigo-900">Roles</h2>
          {canEdit && <AddRoleForm partnerId={partner.id} />}
        </div>
        {partner.partnerRoles.length === 0 ? (
          <p className="text-gray-400 text-sm">No roles defined for this partner.</p>
        ) : (
          <div className="space-y-6">
            {partner.partnerRoles.map((role) => (
              <div key={role.id} className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-semibold text-indigo-900">
                    {role.roleDescription}
                  </h3>
                  {role.person ? (
                    <span className="text-sm text-gray-500 flex items-center">
                      —{" "}
                      <Link
                        href={`/people/${role.person.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {role.person.firstName} {role.person.lastName}
                      </Link>
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">— Vacant</span>
                  )}
                  {canEdit && (
                    <span className="ml-auto flex items-center gap-2">
                      <TagToggle
                        entityId={role.id}
                        entityType="partnerRole"
                        initialTagIds={role.tags.map((t) => t.tag.id)}
                        allTags={allTags}
                      />
                      {role.person ? (
                        <>
                          <RemoveRolePersonButton
                            roleId={role.id}
                            personName={`${role.person.firstName} ${role.person.lastName}`}
                            personId={role.person.id}
                            personOfficeId={role.person.officeId}
                          />
                          <AssignRolePersonButton
                            roleId={role.id}
                            currentPersonId={role.person.id}
                            currentPersonName={`${role.person.firstName} ${role.person.lastName}`}
                            currentOfficeId={role.person.officeId}
                          />
                        </>
                      ) : (
                        <AssignRolePersonButton
                          roleId={role.id}
                          currentPersonId={null}
                        />
                      )}
                      <DeleteRoleButton roleId={role.id} />
                    </span>
                  )}
                </div>

                {role.relationships.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-indigo-900">Connector</th>
                        <th className="text-left px-3 py-2 font-semibold text-indigo-900">Person</th>
                        <th className="text-left px-3 py-2 font-semibold text-indigo-900">Relationship Type</th>
                        <th className="text-left px-3 py-2 font-semibold text-indigo-900">Last Reviewed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {role.relationships.map((rel) => (
                        <tr key={rel.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <Link
                              href={`/people/${rel.person.id}`}
                              className="text-indigo-600 hover:underline"
                            >
                              {rel.person.firstName} {rel.person.lastName}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/people/${rel.targetPerson.id}`}
                              className="text-indigo-600 hover:underline"
                            >
                              {rel.targetPerson.firstName} {rel.targetPerson.lastName}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {rel.relationshipTypes.map((rt) => rt.relationshipType.relationshipDesc).join(", ")}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {rel.lastReviewedDate
                              ? new Date(rel.lastReviewedDate).toLocaleDateString(undefined, { timeZone: "UTC" })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}


                {partner.orgPeopleFlag === "O" && (() => {
                  const pastAssignments = role.roleAssignments.filter(
                    (a) => a.endDate !== null
                  );
                  if (pastAssignments.length === 0) return null;
                  return (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">Role History</h4>
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-3 py-1.5 font-semibold text-indigo-900">Person</th>
                            <th className="text-left px-3 py-1.5 font-semibold text-indigo-900">Start Date</th>
                            <th className="text-left px-3 py-1.5 font-semibold text-indigo-900">End Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pastAssignments.map((a) => (
                            <tr key={a.id} className="hover:bg-gray-50">
                              <td className="px-3 py-1.5">
                                <Link
                                  href={`/people/${a.person.id}`}
                                  className="text-indigo-600 hover:underline"
                                >
                                  {a.person.firstName} {a.person.lastName}
                                </Link>
                              </td>
                              <td className="px-3 py-1.5 text-gray-600">
                                {a.startDate ? new Date(a.startDate).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—"}
                              </td>
                              <td className="px-3 py-1.5 text-gray-600">
                                {a.endDate ? new Date(a.endDate).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* Delete */}
      {canEdit && (
        <div className="border-t border-gray-200 pt-6 mt-6">
          <DeletePartnerButton partnerId={partner.id} />
        </div>
      )}
    </div>
  );
}
