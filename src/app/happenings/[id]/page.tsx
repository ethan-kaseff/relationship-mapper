import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

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
              {new Date(happening.happeningDate).toLocaleDateString()}
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
        <h2 className="text-lg font-semibold text-indigo-900 mb-4">
          Responses ({happening.responses.length})
        </h2>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {happening.responses.map((resp) => (
                <tr key={resp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/people/${resp.person.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {resp.person.firstName} {resp.person.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {resp.responseDate
                      ? new Date(resp.responseDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{resp.responseNotes ?? "—"}</td>
                  <td className="px-4 py-2">
                    {resp.isPublic ? (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        Public
                      </span>
                    ) : (
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        Private
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
