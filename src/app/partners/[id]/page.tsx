import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AddRoleForm from "@/components/AddRoleForm";
import DeletePartnerButton from "@/components/DeletePartnerButton";

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
          relationships: {
            include: {
              person: true,
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
                  {role.person && (
                    <span className="text-sm text-gray-500">
                      —{" "}
                      <Link
                        href={`/people/${role.person.id}`}
                        className="text-[#2E75B6] hover:underline"
                      >
                        {role.person.fullName}
                      </Link>
                    </span>
                  )}
                </div>

                {role.relationships.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-navy">Connector</th>
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
                              {rel.person.fullName}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
