import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";
import { formatCurrency } from "@/lib/currency";
import OfficeDataToggle from "@/components/OfficeDataToggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FundraisersPage() {
  const officeFilter = await getOfficeFilter();
  const fundraisers = await prisma.fundraiser.findMany({
    where: officeFilter,
    include: {
      _count: { select: { donations: true } },
      event: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-indigo-900">Fundraisers</h1>
          <OfficeDataToggle />
        </div>
        <Link
          href="/fundraisers/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          New Fundraiser
        </Link>
      </div>

      {fundraisers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No fundraisers yet. Create your first one to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {fundraisers.map((f) => {
            const pct = f.goalAmount > 0
              ? Math.min(100, Math.round((f.currentAmount / f.goalAmount) * 100))
              : 0;
            return (
              <Link
                key={f.id}
                href={`/fundraisers/${f.id}`}
                className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{f.title}</h2>
                    {f.event && (
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {f.event.title}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      f.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {f.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      {formatCurrency(f.currentAmount)} raised
                    </span>
                    <span className="text-gray-500">
                      {formatCurrency(f.goalAmount)} goal
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>{f._count.donations} donation{f._count.donations !== 1 ? "s" : ""}</span>
                  <span>{pct}% funded</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
