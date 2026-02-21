import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";
import OfficeDataToggle from "@/components/OfficeDataToggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PartnersPage() {
  const officeFilter = await getOfficeFilter();
  const partners = await prisma.partner.findMany({
    where: officeFilter,
    include: {
      organizationType: true,
      _count: { select: { partnerRoles: true } },
    },
    orderBy: { organizationName: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-navy">Partners</h1>
          <OfficeDataToggle />
        </div>
        <Link
          href="/partners/new"
          className="bg-[#2E75B6] text-white px-4 py-2 rounded-md hover:bg-[#245d91] transition-colors"
        >
          Add Partner
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-navy">Organization Name</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Type Flag</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Organization Type</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">City</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">State</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Roles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {partners.map((partner) => (
              <tr key={partner.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/partners/${partner.id}`}
                    className="text-[#2E75B6] hover:underline font-medium"
                  >
                    {partner.organizationName ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      partner.orgPeopleFlag === "O"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {partner.orgPeopleFlag === "O" ? "Org" : "Person"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {partner.organizationType?.typeName ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">{partner.city ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{partner.state ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{partner._count.partnerRoles}</td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No partners found. Add your first partner above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
