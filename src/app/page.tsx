import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ExportPartnersButton from "@/components/ExportPartnersButton";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [peopleCount, partnerCount, relationshipCount, connectionCount, eventCount] =
    await Promise.all([
      prisma.people.count(),
      prisma.partner.count(),
      prisma.relationship.count(),
      prisma.connection.count(),
      prisma.event.count(),
    ]);

  const partnersWithoutRelationships = await prisma.partner.findMany({
    where: {
      partnerRoles: {
        none: {
          relationships: { some: {} },
        },
      },
    },
    include: { organizationType: true },
    orderBy: { organizationName: "asc" },
  });

  const recentConnections = await prisma.connection.findMany({
    take: 5,
    orderBy: { connectionDate: "desc" },
    include: {
      person: true,
      partnerRole: { include: { partner: true } },
    },
  });

  const stats = [
    { label: "People", count: peopleCount, href: "/people", color: "bg-blue-500" },
    { label: "Partners", count: partnerCount, href: "/partners", color: "bg-green-500" },
    { label: "Relationships", count: relationshipCount, href: "/relationships", color: "bg-purple-500" },
    { label: "Interactions", count: connectionCount, href: "/interactions", color: "bg-orange-500" },
    { label: "Events", count: eventCount, href: "/events", color: "bg-red-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className={`text-3xl font-bold text-white ${s.color} rounded-lg w-12 h-12 flex items-center justify-center mb-2`}>
              {s.count}
            </div>
            <div className="text-sm font-medium text-gray-600">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy">Partners Without Relationships</h2>
          <ExportPartnersButton partners={JSON.parse(JSON.stringify(partnersWithoutRelationships))} />
        </div>
        {partnersWithoutRelationships.length === 0 ? (
          <p className="text-gray-500">All partners have at least one relationship.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-gray-500">
                <th className="pb-2">Partner</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">City</th>
                <th className="pb-2">State</th>
              </tr>
            </thead>
            <tbody>
              {partnersWithoutRelationships.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2">
                    <Link href={`/partners/${p.id}`} className="text-[#2E75B6] hover:underline font-medium">
                      {p.organizationName || "—"}
                    </Link>
                  </td>
                  <td className="py-2 text-gray-600">{p.organizationType?.typeName || "—"}</td>
                  <td className="py-2 text-gray-600">{p.city || "—"}</td>
                  <td className="py-2 text-gray-600">{p.state || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Recent Interactions</h2>
        {recentConnections.length === 0 ? (
          <p className="text-gray-500">No interactions logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-gray-500">
                <th className="pb-2">Date</th>
                <th className="pb-2">Connector</th>
                <th className="pb-2">Partner</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {recentConnections.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2">{new Date(c.connectionDate).toLocaleDateString()}</td>
                  <td className="py-2">{c.person.fullName}</td>
                  <td className="py-2">
                    {c.partnerRole.partner.organizationName} ({c.partnerRole.roleDescription})
                  </td>
                  <td className="py-2 text-gray-600">{c.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
