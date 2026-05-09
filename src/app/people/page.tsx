import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";
import { auth } from "@/lib/auth";
import OfficeDataToggle from "@/components/OfficeDataToggle";
import PeopleTable from "@/components/PeopleTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PeoplePage() {
  const officeFilter = await getOfficeFilter();
  const [people, allTags] = await Promise.all([
    prisma.people.findMany({
      where: officeFilter,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        city: true,
        state: true,
        phoneNumber: true,
        email1: true,
        email2: true,
        isConnector: true,
        status: true,
        tags: { select: { tag: { select: { id: true } } } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.tag.findMany({
      where: officeFilter,
      orderBy: { name: "asc" },
    }),
  ]);

  const session = await auth();
  const role = session?.user?.role;
  const canWrite = role !== "CONNECTOR" && role !== "VIEWER";

  const peopleWithTags = people.map((p) => ({
    ...p,
    tagIds: p.tags.map((t) => t.tag.id),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-indigo-900">People</h1>
          <OfficeDataToggle />
        </div>
        {canWrite && (
          <Link
            href="/people/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Add Person
          </Link>
        )}
      </div>

      <PeopleTable people={peopleWithTags} allTags={allTags} />
    </div>
  );
}
