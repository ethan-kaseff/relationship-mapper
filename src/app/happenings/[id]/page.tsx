import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AddHappeningResponseForm from "@/components/AddHappeningResponseForm";
import HappeningResponseRow from "@/components/HappeningResponseRow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HappeningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const happening = await prisma.happening.findUnique({
    where: { id },
    include: {
      responses: {
        include: { person: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!happening) return notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-indigo-900">{happening.happeningDescription}</h1>
        <Link
          href="/happenings"
          className="text-indigo-600 hover:underline text-sm"
        >
          Back to Responses
        </Link>
      </div>

      {/* Happening Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-indigo-900 mb-4">Happening Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-500">Date:</span>{" "}
            <span className="text-gray-800">
              {new Date(happening.happeningDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Time:</span>{" "}
            <span className="text-gray-800">{happening.happeningTime ?? "—"}</span>
          </div>
          <div className="md:col-span-2">
            <span className="font-medium text-gray-500">Description:</span>{" "}
            <span className="text-gray-800">{happening.happeningDescription}</span>
          </div>
        </div>
      </div>

      {/* Responses */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-indigo-900">
            Responses ({happening.responses.length})
          </h2>
          <AddHappeningResponseForm happeningId={id} />
        </div>
        {happening.responses.length === 0 ? (
          <p className="text-gray-400 text-sm">No responses recorded for this happening.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Person</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Response Date</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Notes</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Visibility</th>
                <th className="text-left px-4 py-2 font-semibold text-indigo-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {happening.responses.map((resp) => (
                <HappeningResponseRow
                  key={resp.id}
                  response={{
                    id: resp.id,
                    responseDate: resp.responseDate?.toISOString() ?? null,
                    responseTime: resp.responseTime,
                    responseNotes: resp.responseNotes,
                    isPublic: resp.isPublic,
                    platform: resp.platform,
                    platformLink: resp.platformLink,
                    person: resp.person,
                  }}
                  mode="happening"
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
