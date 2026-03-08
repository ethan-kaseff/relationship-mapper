import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeFilter } from "@/lib/office-filter";
import OfficeDataToggle from "@/components/OfficeDataToggle";
import RelationshipSearch from "@/components/RelationshipSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RelationshipsPage() {
  const officeFilter = await getOfficeFilter();
  const personFilter = officeFilter.officeId ? { person: { officeId: officeFilter.officeId } } : {};
  const relationships = await prisma.relationship.findMany({
    where: personFilter,
    include: {
      person: true,
      targetPerson: true,
      partnerRole: {
        include: { partner: true },
      },
      relationshipType: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = relationships.map((rel) => ({
    id: rel.id,
    person: { id: rel.person.id, firstName: rel.person.firstName, lastName: rel.person.lastName },
    targetPerson: { id: rel.targetPerson.id, firstName: rel.targetPerson.firstName, lastName: rel.targetPerson.lastName },
    partnerRole: rel.partnerRole
      ? {
          roleDescription: rel.partnerRole.roleDescription,
          partner: { id: rel.partnerRole.partner.id, organizationName: rel.partnerRole.partner.organizationName },
        }
      : null,
    relationshipType: { relationshipDesc: rel.relationshipType.relationshipDesc },
    lastReviewedDate: rel.lastReviewedDate ? rel.lastReviewedDate.toISOString() : null,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-indigo-900">Relationships</h1>
          <OfficeDataToggle />
        </div>
        <Link
          href="/relationships/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Add Relationship
        </Link>
      </div>

      <RelationshipSearch relationships={serialized} />
    </div>
  );
}
