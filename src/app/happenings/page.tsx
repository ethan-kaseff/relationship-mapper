import Link from "next/link";
import { prisma } from "@/lib/prisma";
import OfficeDataToggle from "@/components/OfficeDataToggle";
import HappeningsTable from "@/components/HappeningsTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HappeningsPage() {
  const happenings = await prisma.happening.findMany({
    include: {
      _count: { select: { responses: true } },
    },
    orderBy: { happeningDate: "desc" },
  });

  const serialized = happenings.map((h) => ({
    id: h.id,
    happeningDescription: h.happeningDescription,
    happeningDate: h.happeningDate.toISOString(),
    _count: h._count,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-indigo-900">Responses</h1>
          <OfficeDataToggle />
        </div>
        <Link
          href="/happenings/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Add Happening
        </Link>
      </div>

      <HappeningsTable happenings={serialized} />
    </div>
  );
}
