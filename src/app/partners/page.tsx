import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";
import { auth } from "@/lib/auth";
import OfficeDataToggle from "@/components/OfficeDataToggle";
import PartnersTable from "@/components/PartnersTable";

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

  const session = await auth();
  const role = session?.user?.role;
  const canWrite = role !== "CONNECTOR" && role !== "VIEWER";

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
