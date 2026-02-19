import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InteractionsPage() {
  const officeFilter = await getOfficeFilter();
  const personFilter = officeFilter.officeId ? { person: { officeId: officeFilter.officeId } } : {};
  const connections = await prisma.connection.findMany({
    where: personFilter,
    include: {
      person: true,
      partnerRole: {
        include: { partner: true },
      },
    },
    orderBy: { connectionDate: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Interactions</h1>
        <Link
          href="/interactions/new"
          className="bg-[#2E75B6] text-white px-4 py-2 rounded-md hover:bg-[#245d91] transition-colors"
        >
          Add Interaction
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-navy">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Connector</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Partner</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {connections.map((conn) => (
              <tr key={conn.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">
                  {new Date(conn.connectionDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/people/${conn.person.id}`}
                    className="text-[#2E75B6] hover:underline font-medium"
                  >
                    {conn.person.firstName} {conn.person.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/partners/${conn.partnerRole.partner.id}`}
                    className="text-[#2E75B6] hover:underline"
                  >
                    {conn.partnerRole.partner.organizationName ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {conn.partnerRole.roleDescription}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                  {conn.notes ?? "—"}
                </td>
              </tr>
            ))}
            {connections.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No interactions found. Add your first interaction above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
