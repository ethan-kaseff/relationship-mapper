import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter, isCrossOfficeView } from "@/lib/office-filter";
import { auth } from "@/lib/auth";
import OfficeDataToggle from "@/components/OfficeDataToggle";
import PeoplePageClient from "@/components/PeoplePageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PeoplePage() {
  const [officeFilter, session, crossOffice] = await Promise.all([
    getOfficeFilter(),
    auth(),
    isCrossOfficeView(),
  ]);

  const role = session?.user?.role;
  const canWrite = role !== "CONNECTOR" && role !== "VIEWER" && !crossOffice;
  const myOfficeId = session?.user?.officeId as string | undefined;

  const peopleWhere = crossOffice && myOfficeId
    ? {
        ...officeFilter,
        OR: [
          { officeId: myOfficeId },
          {
            officeId: { not: myOfficeId },
            OR: [
              { relationships: { some: {} } },
              { targetOfRelationships: { some: {} } },
            ],
          },
        ],
      }
    : officeFilter;

  const people = await prisma.people.findMany({
    where: peopleWhere,
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
  });

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

      <PeoplePageClient people={peopleWithTags} />
    </div>
  );
}
