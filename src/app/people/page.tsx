import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";
import OfficeDataToggle from "@/components/OfficeDataToggle";
import PeopleTable from "@/components/PeopleTable";

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
          <h1 className="text-2xl font-bold text-indigo-900">People</h1>
          <OfficeDataToggle />
        </div>
        <Link
          href="/people/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Add Person
        </Link>
      </div>

      <PeopleTable people={people} />
    </div>
  );
}
