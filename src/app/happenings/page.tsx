import Link from "next/link";
import { prisma } from "@/lib/prisma";
import OfficeDataToggle from "@/components/OfficeDataToggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HappeningsPage() {
  const happenings = await prisma.happening.findMany({
    include: {
      _count: { select: { responses: true } },
    },
    orderBy: { happeningDate: "desc" },
  });

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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Time</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Description</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Responses</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {happenings.map((happening) => (
              <tr key={happening.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">
                  {new Date(happening.happeningDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-gray-600">{happening.happeningTime ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/happenings/${happening.id}`}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    {happening.happeningDescription}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {happening._count.responses}
                  </span>
                </td>
              </tr>
            ))}
            {happenings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No happenings found. Add your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
