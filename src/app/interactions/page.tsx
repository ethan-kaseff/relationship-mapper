import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";
import OfficeDataToggle from "@/components/OfficeDataToggle";
import InteractionsTable from "@/components/InteractionsTable";

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

  const serialized = connections.map((conn) => ({
    id: conn.id,
    connectionDate: conn.connectionDate.toISOString(),
    notes: conn.notes,
    person: {
      id: conn.person.id,
      firstName: conn.person.firstName,
      lastName: conn.person.lastName,
    },
    partnerRole: {
      roleDescription: conn.partnerRole.roleDescription,
      partner: {
        id: conn.partnerRole.partner.id,
        organizationName: conn.partnerRole.partner.organizationName,
      },
    },
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-indigo-900">Interactions</h1>
          <OfficeDataToggle />
        </div>
        <Link
          href="/interactions/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Add Interaction
        </Link>
      </div>

      <InteractionsTable connections={serialized} />
    </div>
  );
}
