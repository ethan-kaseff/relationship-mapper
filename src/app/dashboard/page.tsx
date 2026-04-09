import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PartnersWithoutRelationships from "@/components/PartnersWithoutRelationships";
import { getOfficeFilter } from "@/lib/office-filter";

export const dynamic = "force-dynamic";

function StatIcon({ label }: { label: string }) {
  switch (label) {
    case "People":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.997M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      );
    case "Partners":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      );
    case "Relationships":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.25l4.5 4.5" />
        </svg>
      );
    case "Interactions":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      );
    case "Happenings":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      );
    case "Events":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
      );
    default:
      return null;
  }
}

export default async function Dashboard() {
  const officeFilter = await getOfficeFilter();
  const personFilter = officeFilter.officeId ? { person: { officeId: officeFilter.officeId } } : {};

  const [peopleCount, partnerCount, relationshipCount, connectionCount, happeningCount, eventCount] =
    await Promise.all([
      prisma.people.count({ where: officeFilter }),
      prisma.partner.count({ where: officeFilter }),
      prisma.relationship.count({ where: personFilter }),
      prisma.connection.count({ where: personFilter }),
      prisma.happening.count(),
      prisma.event.count({ where: officeFilter }),
    ]);

  const partnersWithoutRelationships = await prisma.partner.findMany({
    where: {
      ...officeFilter,
      partnerRoles: {
        some: {
          relationships: { none: {} },
        },
      },
    },
    include: { organizationType: true, partnerRoles: { include: { _count: { select: { relationships: true } } } } },
    orderBy: { organizationName: "asc" },
  });

  const recentConnections = await prisma.connection.findMany({
    where: personFilter,
    take: 5,
    orderBy: { connectionDate: "desc" },
    include: {
      person: true,
      partnerRole: { include: { partner: true, person: true } },
    },
  });

  const stats = [
    { label: "People", count: peopleCount, href: "/people" },
    { label: "Partners", count: partnerCount, href: "/partners" },
    { label: "Relationships", count: relationshipCount, href: "/relationships" },
    { label: "Interactions", count: connectionCount, href: "/interactions" },
    { label: "Happenings", count: happeningCount, href: "/happenings" },
    { label: "Events", count: eventCount, href: "/events" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-indigo-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your relationship network</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group bg-white rounded-lg shadow p-5 hover:shadow-md transition-all border border-transparent hover:border-indigo-200"
          >
            <div className="flex items-start gap-3">
              <div className="bg-indigo-50 text-indigo-600 rounded-full p-2.5 group-hover:bg-indigo-100 transition-colors">
                <StatIcon label={s.label} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{s.count}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <PartnersWithoutRelationships partners={JSON.parse(JSON.stringify(partnersWithoutRelationships))} />

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-indigo-900">Recent Interactions</h2>
          <Link href="/interactions" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View all &rarr;
          </Link>
        </div>
        {recentConnections.length === 0 ? (
          <p className="text-gray-500">No interactions logged yet.</p>
        ) : (
          <div className="space-y-4">
            {recentConnections.map((c) => {
              const initials = `${c.person.firstName?.[0] || ""}${c.person.lastName?.[0] || ""}`;
              const notes = c.notes || "";
              const truncatedNotes = notes.length > 100 ? notes.slice(0, 100) + "..." : notes;
              return (
                <div key={c.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">
                        {c.person.firstName} {c.person.lastName}
                      </span>
                      <span className="text-gray-400">&middot;</span>
                      <span className="text-gray-500">
                        {new Date(c.connectionDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {c.partnerRole.person && (
                        <>{c.partnerRole.person.firstName} {c.partnerRole.person.lastName} &middot; </>
                      )}
                      {c.partnerRole.partner.organizationName}
                      {c.partnerRole.roleDescription && (
                        <> &middot; {c.partnerRole.roleDescription}</>
                      )}
                    </div>
                    {truncatedNotes && (
                      <p className="text-sm text-gray-400 mt-1">{truncatedNotes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
