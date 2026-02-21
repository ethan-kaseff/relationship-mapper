import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";
import OfficeDataToggle from "@/components/OfficeDataToggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RelationshipsPage() {
  const officeFilter = await getOfficeFilter();
  const personFilter = officeFilter.officeId ? { person: { officeId: officeFilter.officeId } } : {};
  const relationships = await prisma.relationship.findMany({
    where: personFilter,
    include: {
      person: true,
      targetPerson: true,
      partnerRole: {
        include: { partner: true },
      },
      relationshipType: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-navy">Relationships</h1>
          <OfficeDataToggle />
        </div>
        <Link
          href="/relationships/new"
          className="bg-[#2E75B6] text-white px-4 py-2 rounded-md hover:bg-[#245d91] transition-colors"
        >
          Add Relationship
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-navy">Connector</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Person</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Partner / Role</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Relationship Type</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Last Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {relationships.map((rel) => (
              <tr key={rel.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/people/${rel.person.id}`}
                    className="text-[#2E75B6] hover:underline font-medium"
                  >
                    {rel.person.firstName} {rel.person.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/people/${rel.targetPerson.id}`}
                    className="text-[#2E75B6] hover:underline font-medium"
                  >
                    {rel.targetPerson.firstName} {rel.targetPerson.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {rel.partnerRole ? (
                    <Link
                      href={`/partners/${rel.partnerRole.partner.id}`}
                      className="text-[#2E75B6] hover:underline"
                    >
                      {rel.partnerRole.partner.organizationName ?? "—"} — {rel.partnerRole.roleDescription}
                    </Link>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {rel.relationshipType.relationshipDesc}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {rel.lastReviewedDate
                    ? new Date(rel.lastReviewedDate).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
            {relationships.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No relationships found. Add your first relationship above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
