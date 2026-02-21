import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AddRoleForm from "@/components/AddRoleForm";
import DeletePartnerButton from "@/components/DeletePartnerButton";
import RemoveRolePersonButton from "@/components/RemoveRolePersonButton";
import AssignRolePersonButton from "@/components/AssignRolePersonButton";

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
        },
      },
    },
  });

  if (!partner) return notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">
          {partner.organizationName ?? "Partner Detail"}
        </h1>
        <div className="flex items-center gap-4">
          <DeletePartnerButton partnerId={partner.id} />
          <Link
            href="/partners"
            className="text-[#2E75B6] hover:underline text-sm"
          >
            Back to Partners
          </Link>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Partner Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-500">Type:</span>{" "}
            <span
              className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                partner.orgPeopleFlag === "O"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-orange-100 text-orange-800"
              }`}
            >
              {partner.orgPeopleFlag === "O" ? "Organization" : "Person"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Organization Type:</span>{" "}
            <span className="text-gray-800">
              {partner.organizationType?.typeName ?? "—"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Address:</span>{" "}
            <span className="text-gray-800">{partner.address ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">City:</span>{" "}
            <span className="text-gray-800">{partner.city ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">State:</span>{" "}
            <span className="text-gray-800">{partner.state ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Zip:</span>{" "}
            <span className="text-gray-800">{partner.zip ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Phone:</span>{" "}
            <span className="text-gray-800">{partner.phoneNumber ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Email:</span>{" "}
            <span className="text-gray-800">{partner.email ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Website:</span>{" "}
            {partner.website ? (
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2E75B6] hover:underline"
              >
                {partner.website}
              </a>
            ) : (
              <span className="text-gray-800">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Roles & Relationships */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy">Roles</h2>
          <AddRoleForm partnerId={partner.id} />
        </div>
        {partner.partnerRoles.length === 0 ? (
          <p className="text-gray-400 text-sm">No roles defined for this partner.</p>
        ) : (
          <div className="space-y-6">
            {partner.partnerRoles.map((role) => (
              <div key={role.id} className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-semibold text-navy">{role.roleDescription}</h3>
                  {role.person ? (
                    <span className="text-sm text-gray-500 flex items-center">
                      —{" "}
                      <Link
                        href={`/people/${role.person.id}`}
                        className="text-[#2E75B6] hover:underline"
                      >
                        {role.person.firstName} {role.person.lastName}
                      </Link>
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
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 flex items-center">
                      — Vacant
                      <AssignRolePersonButton
                        roleId={role.id}
                        currentPersonId={null}
                      />
                    </span>
                  )}
                </div>

                {role.relationships.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-navy">Connector</th>
                        <th className="text-left px-3 py-2 font-semibold text-navy">Person</th>
                        <th className="text-left px-3 py-2 font-semibold text-navy">Relationship Type</th>
                        <th className="text-left px-3 py-2 font-semibold text-navy">Last Reviewed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {role.relationships.map((rel) => (
                        <tr key={rel.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <Link
                              href={`/people/${rel.person.id}`}
                              className="text-[#2E75B6] hover:underline"
                            >
                              {rel.person.firstName} {rel.person.lastName}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/people/${rel.targetPerson.id}`}
                              className="text-[#2E75B6] hover:underline"
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

                {role.relationships.length === 0 && (
                  <p className="text-gray-400 text-xs">No relationships for this role.</p>
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
                            <th className="text-left px-3 py-1.5 font-semibold text-navy">Person</th>
                            <th className="text-left px-3 py-1.5 font-semibold text-navy">Start Date</th>
                            <th className="text-left px-3 py-1.5 font-semibold text-navy">End Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pastAssignments.map((a) => (
                            <tr key={a.id} className="hover:bg-gray-50">
                              <td className="px-3 py-1.5">
                                <Link
                                  href={`/people/${a.person.id}`}
                                  className="text-[#2E75B6] hover:underline"
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
      </div>
    </div>
  );
}
