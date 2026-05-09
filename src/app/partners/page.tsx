import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter, isCrossOfficeView } from "@/lib/office-filter";
import { auth } from "@/lib/auth";
import OfficeDataToggle from "@/components/OfficeDataToggle";
import PartnersTable from "@/components/PartnersTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PartnersPage() {
  const [officeFilter, session, crossOffice] = await Promise.all([
    getOfficeFilter(),
    auth(),
    isCrossOfficeView(),
  ]);

  const role = session?.user?.role;
  const canWrite = role !== "CONNECTOR" && role !== "VIEWER" && !crossOffice;
  const myOfficeId = session?.user?.officeId as string | undefined;

  const partnersWhere = crossOffice && myOfficeId
    ? {
        ...officeFilter,
        OR: [
          { officeId: myOfficeId },
          {
            officeId: { not: myOfficeId },
            partnerRoles: { some: { relationships: { some: {} } } },
          },
        ],
      }
    : officeFilter;

  const partners = await prisma.partner.findMany({
    where: partnersWhere,
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
          <h1 className="text-2xl font-bold text-indigo-900">Partners</h1>
          <OfficeDataToggle />
        </div>
        {canWrite && (
          <Link
            href="/partners/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Add Partner
          </Link>
        )}
      </div>

      <PartnersTable partners={partners} />
    </div>
  );
}
