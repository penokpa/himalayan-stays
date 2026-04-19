export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function trekRouteLabel(route: string): string {
  const labels: Record<string, string> = {
    EBC: "Everest BC",
    ABC: "Annapurna BC",
    LANGTANG: "Langtang",
    MANASLU: "Manaslu",
    UPPER_MUSTANG: "Upper Mustang",
  };
  return labels[route] ?? route;
}

export default async function LodgesPage() {
  const lodges = await prisma.lodge.findMany({
    orderBy: [{ trekRoute: "asc" }, { trailPosition: "asc" }],
    include: {
      _count: { select: { rooms: true } },
    },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Lodges</h1>
        <Link
          href="/admin/lodges/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          Add Lodge
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Village
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Trek Route
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Altitude (m)
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Rooms
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lodges.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    No lodges yet. Add your first lodge to get started.
                  </td>
                </tr>
              )}
              {lodges.map((lodge) => (
                <tr key={lodge.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/admin/lodges/${lodge.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {lodge.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {lodge.village}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {trekRouteLabel(lodge.trekRoute)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                    {lodge.altitudeMeters?.toLocaleString() ?? "--"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                    {lodge._count.rooms}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    {lodge.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
