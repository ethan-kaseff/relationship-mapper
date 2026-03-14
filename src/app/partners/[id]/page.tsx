import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AddRoleForm from "@/components/AddRoleForm";
import DeletePartnerButton from "@/components/DeletePartnerButton";
import EditPartnerInfo from "@/components/EditPartnerInfo";
import RemoveRolePersonButton from "@/components/RemoveRolePersonButton";
import AssignRolePersonButton from "@/components/AssignRolePersonButton";
import DeleteRoleButton from "@/components/DeleteRoleButton";
import AnnualInviteToggle from "@/components/AnnualInviteToggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [partner, allAnnualEventTypesUnfiltered] = await Promise.all([
    prisma.partner.findUnique({
      where: { id },
      include: {
        organizationType: true,
        annualEventTypes: {
          include: { annualEventType: true },
        },
        partnerRoles: {
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
                relationshipType: true,
              },
            },
            annualEventTypes: {
              include: { annualEventType: true },
            },
          },
        },
      },
    }),
    prisma.annualEventType.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!partner) return notFound();

  const allAnnualEventTypes = allAnnualEventTypesUnfiltered.filter(
    (t) => t.officeId === partner.officeId
  );

  const partnerAetIds = partner.annualEventTypes.map((a) => a.annualEventType.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-indigo-900">
          {partner.organizationName ?? "Partner Detail"}
        </h1>
        <Link
          href="/partners"
          className="text-indigo-600 hover:underline text-sm"
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
        }}
        annualEventTypeIds={partner.orgPeopleFlag === "P" ? partnerAetIds : undefined}
        allAnnualEventTypes={allAnnualEventTypes}
      />

      {/* Roles & Relationships — only for Organizations */}
      {partner.orgPeopleFlag === "O" && <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-indigo-900">Roles</h2>
          <AddRoleForm partnerId={partner.id} allAnnualEventTypes={allAnnualEventTypes} />
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
                  <span className="ml-auto flex items-center gap-2">
                    <AnnualInviteToggle
                      roleId={role.id}
                      initialTypeIds={role.annualEventTypes.map((a) => a.annualEventType.id)}
                      allTypes={allAnnualEventTypes}
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
                            {rel.relationshipType.relationshipDesc}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {rel.lastReviewedDate
                              ? new Date(rel.lastReviewedDate).toLocaleDateString()
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
                                {a.startDate ? new Date(a.startDate).toLocaleDateString() : "—"}
                              </td>
                              <td className="px-3 py-1.5 text-gray-600">
                                {a.endDate ? new Date(a.endDate).toLocaleDateString() : "—"}
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
      <div className="border-t border-gray-200 pt-6 mt-6">
        <DeletePartnerButton partnerId={partner.id} />
      </div>
    </div>
  );
}
