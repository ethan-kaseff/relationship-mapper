import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";
import OfficeDataToggle from "@/components/OfficeDataToggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PeoplePage() {
  const officeFilter = await getOfficeFilter();
  const people = await prisma.people.findMany({
    where: officeFilter,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-navy">People</h1>
          <OfficeDataToggle />
        </div>
        <Link
          href="/people/new"
          className="bg-[#2E75B6] text-white px-4 py-2 rounded-md hover:bg-[#245d91] transition-colors"
        >
          Add Person
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-navy">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">City</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">State</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-navy">Connector</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {people.map((person) => (
              <tr key={person.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/people/${person.id}`}
                    className="text-[#2E75B6] hover:underline font-medium"
                  >
                    {person.lastName}, {person.firstName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{person.city ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{person.state ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{person.phoneNumber ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{person.personalEmail ?? "—"}</td>
                <td className="px-4 py-3">
                  {person.isConnector && (
                    <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      Connector
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {people.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No people found. Add your first person above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
